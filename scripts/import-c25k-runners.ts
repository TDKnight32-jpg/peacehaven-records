import { parseRunnersTab, type ParsedC25kRunner } from "../lib/c25k-csv-parser";
import { uniqueSlug } from "../lib/slug";
import { getCurrentCohort } from "../lib/c25k";
import { C25K_RUNNERS_SHEET_PUBLISH_BASE, RUNNERS_TAB_GID } from "./c25k-sheet-config";
import { prisma } from "../lib/db";

/** Google's publish-to-CSV endpoint has been intermittently slow/hanging —
 * retry a few times with backoff before giving up, same as import-gp.ts. */
async function fetchCsv(gid: string): Promise<string> {
  const url = `${C25K_RUNNERS_SHEET_PUBLISH_BASE}&gid=${gid}`;
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.text();
    } catch (err) {
      lastError = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  throw new Error(`Failed to fetch CSV (gid=${gid}) after 3 attempts: ${lastError}`);
}

/** Fails loudly rather than letting a bad parse silently reach the DB —
 * same philosophy as import-gp.ts's sanityCheck. Every parser warning is
 * fatal here, plus a same-sheet duplicate-email check the parser itself
 * can't do. */
function sanityCheck(runners: ParsedC25kRunner[], parserWarnings: string[]) {
  const errors: string[] = parserWarnings.map((w) => `parser warning: ${w}`);

  const seen = new Set<string>();
  for (const r of runners) {
    if (seen.has(r.email)) {
      errors.push(`duplicate email in sheet: "${r.email}"`);
    }
    seen.add(r.email);
  }

  if (errors.length > 0) {
    throw new Error(`Import sanity check failed (${errors.length} issue(s)):\n- ${errors.join("\n- ")}`);
  }
}

async function main() {
  const write = process.argv.includes("--write");

  if (C25K_RUNNERS_SHEET_PUBLISH_BASE.includes("REPLACE_WITH") || RUNNERS_TAB_GID.includes("REPLACE_WITH")) {
    throw new Error(
      "scripts/c25k-sheet-config.ts still has placeholder values — fill in C25K_RUNNERS_SHEET_PUBLISH_BASE and RUNNERS_TAB_GID once the runner-list sheet is published to the web.",
    );
  }

  const cohort = await getCurrentCohort();
  if (!cohort) {
    throw new Error("No Cohort exists yet — add one via Prisma Studio (the Cohort table) before running this import.");
  }

  console.log("Fetching runner-list tab...");
  const csvText = await fetchCsv(RUNNERS_TAB_GID);
  const warnings: string[] = [];
  const rows = parseRunnersTab(csvText, warnings);

  console.log("Running sanity checks...");
  sanityCheck(rows, warnings);
  console.log("Sanity checks passed.");
  console.log(`Parsed ${rows.length} row(s) for cohort "${cohort.name}".`);

  const [existingRunnersWithEmail, allRunnerSlugs, existingEnrollments] = await Promise.all([
    prisma.runner.findMany({ where: { email: { not: null } } }),
    prisma.runner.findMany({ select: { slug: true } }),
    prisma.cohortRunner.findMany({ where: { cohortId: cohort.id }, select: { runnerId: true } }),
  ]);

  const runnerByEmail = new Map(existingRunnersWithEmail.map((r) => [r.email!, r]));
  const takenSlugs = new Set(allRunnerSlugs.map((r) => r.slug));
  const enrolledRunnerIds = new Set(existingEnrollments.map((e) => e.runnerId));

  let createdCount = 0;
  let enrolledCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    let runner = runnerByEmail.get(row.email);
    const isNewRunner = !runner;

    if (isNewRunner) {
      createdCount++;
      if (write) {
        runner = await prisma.runner.create({
          data: { name: row.name, email: row.email, slug: uniqueSlug(row.name, takenSlugs) },
        });
        runnerByEmail.set(row.email, runner);
      }
    }

    const alreadyEnrolled = runner ? enrolledRunnerIds.has(runner.id) : false;
    if (alreadyEnrolled) {
      skippedCount++;
      continue;
    }

    enrolledCount++;
    if (write && runner) {
      await prisma.cohortRunner.create({ data: { cohortId: cohort.id, runnerId: runner.id } });
      enrolledRunnerIds.add(runner.id);
    }
  }

  const verb = write ? "" : "would be ";
  console.log(
    `\nSummary for "${cohort.name}": ${createdCount} new runner(s) ${verb}created, ${enrolledCount} ${verb}enrolled, ` +
      `${skippedCount} skipped as already enrolled.`,
  );

  if (!write) {
    console.log("\nDry run only — no database writes made. Review the summary, then re-run with --write.");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

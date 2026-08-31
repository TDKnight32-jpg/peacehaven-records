import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  parseEventsTab,
  parseRaceTab,
  type ParsedGpEvent,
  type ParsedGpResult,
} from "../lib/gp-csv-parser";
import { normalizeRunnerName } from "../lib/runner-match";
import { normalizeWhitespace, levenshteinDistance } from "../lib/text";
import { uniqueSlug } from "../lib/slug";
import { GP_SHEET_PUBLISH_BASE, EVENTS_TAB_GID, RACE_TABS } from "./gp-sheet-config";
import { prisma } from "../lib/db";

/** Google's publish-to-CSV endpoint (and/or Node's fetch connection pooling
 * against it) has been intermittently slow/hanging — curl against the same
 * URL responds in under a second, so retry a few times with backoff before
 * giving up, rather than requiring a full manual re-run of the script. */
async function fetchCsv(gid: string): Promise<string> {
  const url = `${GP_SHEET_PUBLISH_BASE}&gid=${gid}`;
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

interface RaceTabResult {
  tabName: string;
  results: ParsedGpResult[];
}

/**
 * Fails loudly (throws) rather than letting a bad parse silently reach the
 * DB — same philosophy as scripts/import-records.ts. Every warning the
 * parser raised is treated as fatal here, plus cross-tab checks the parser
 * itself can't do (it only sees one tab at a time): every configured race
 * tab must match an Events-tab row and vice versa, and no tab may contain a
 * duplicate (runner, category) pair.
 */
function sanityCheck(events: ParsedGpEvent[], raceTabs: RaceTabResult[], parserWarnings: string[]) {
  const errors: string[] = parserWarnings.map((w) => `parser warning: ${w}`);

  const eventNames = new Set(events.map((e) => normalizeWhitespace(e.name)));
  const raceTabNames = new Set(raceTabs.map((t) => normalizeWhitespace(t.tabName)));

  for (const e of events) {
    if (!raceTabNames.has(normalizeWhitespace(e.name))) {
      errors.push(`Events tab lists "${e.name}" but no matching entry exists in RACE_TABS`);
    }
    if (!e.date) errors.push(`Event "${e.name}" has no parseable date`);
    if (!e.scoringType) errors.push(`Event "${e.name}" has no recognized scoring type`);
  }
  for (const t of raceTabs) {
    if (!eventNames.has(normalizeWhitespace(t.tabName))) {
      errors.push(`RACE_TABS entry "${t.tabName}" has no matching row in the Events tab`);
    }
    const seen = new Set<string>();
    for (const r of t.results) {
      if (!r.category) {
        errors.push(`"${t.tabName}": row for "${r.runnerName}" has no recognized category`);
        continue;
      }
      const key = `${normalizeRunnerName(r.runnerName)}:${r.category}`;
      if (seen.has(key)) {
        errors.push(`"${t.tabName}": duplicate result for "${r.runnerName}" (${r.category})`);
      }
      seen.add(key);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Import sanity check failed (${errors.length} issue(s)):\n- ${errors.join("\n- ")}`);
  }
}

interface RenameCandidate {
  oldRunner: { id: string; name: string; slug: string };
  newName: string;
  distance: number;
}

/**
 * Flags existing runners whose (normalized) name doesn't appear anywhere in
 * this import batch — the signal for "the sheet's spelling of their name
 * was corrected" — and suggests the closest previously-unseen name in the
 * batch as the likely replacement, by edit distance. Purely informational:
 * never merges on its own, since misidentifying two different people as one
 * would corrupt both of their race histories. Confirm each suggestion, then
 * apply it with `--rename-runner <slug> "<New Name>"` before re-running the
 * import — that updates the Runner's name in place (same id/slug) so the
 * next import matches the corrected spelling instead of creating a
 * duplicate.
 */
function detectRenameCandidates(
  raceTabs: RaceTabResult[],
  existingRunners: { id: string; name: string; slug: string }[],
): RenameCandidate[] {
  const rawByNorm = new Map<string, string>();
  for (const t of raceTabs) {
    for (const r of t.results) rawByNorm.set(normalizeRunnerName(r.runnerName), r.runnerName);
  }
  const namesInBatch = new Set(rawByNorm.keys());
  const existingNorms = new Set(existingRunners.map((r) => normalizeRunnerName(r.name)));

  const disappeared = existingRunners.filter((r) => !namesInBatch.has(normalizeRunnerName(r.name)));
  const newNames = [...namesInBatch].filter((n) => !existingNorms.has(n));

  const candidates: RenameCandidate[] = [];
  for (const old of disappeared) {
    const oldNorm = normalizeRunnerName(old.name);
    let best: { norm: string; distance: number } | null = null;
    for (const newNorm of newNames) {
      const distance = levenshteinDistance(oldNorm, newNorm);
      const threshold = Math.max(2, Math.ceil(Math.max(oldNorm.length, newNorm.length) * 0.3));
      if (distance <= threshold && (!best || distance < best.distance)) {
        best = { norm: newNorm, distance };
      }
    }
    if (best) candidates.push({ oldRunner: old, newName: rawByNorm.get(best.norm)!, distance: best.distance });
  }
  return candidates;
}

function buildReport(events: ParsedGpEvent[], raceTabs: RaceTabResult[]) {
  return {
    totalEvents: events.length,
    totalResults: raceTabs.reduce((sum, t) => sum + t.results.length, 0),
    events: events.map((e) => ({
      name: e.name,
      date: e.date?.toISOString() ?? null,
      distanceSlug: e.distanceSlug,
      scoringType: e.scoringType,
      isSussexGp: e.isSussexGp,
      resultCount: raceTabs.find((t) => normalizeWhitespace(t.tabName) === normalizeWhitespace(e.name))?.results.length ?? 0,
    })),
    sampleResults: raceTabs[0]?.results.slice(0, 5) ?? [],
  };
}

async function main() {
  const renameFlagIdx = process.argv.indexOf("--rename-runner");
  if (renameFlagIdx !== -1) {
    const slug = process.argv[renameFlagIdx + 1];
    const newName = process.argv[renameFlagIdx + 2];
    if (!slug || !newName) {
      throw new Error('Usage: --rename-runner <slug> "<New Name>"');
    }
    const runner = await prisma.runner.update({ where: { slug }, data: { name: newName } });
    console.log(`Renamed runner ${slug} -> "${runner.name}" (id ${runner.id}, slug unchanged).`);
    return;
  }

  const mergeFlagIdx = process.argv.indexOf("--merge-runners");
  if (mergeFlagIdx !== -1) {
    const keepSlug = process.argv[mergeFlagIdx + 1];
    const mergeSlug = process.argv[mergeFlagIdx + 2];
    if (!keepSlug || !mergeSlug) {
      throw new Error("Usage: --merge-runners <keep-slug> <merge-slug>");
    }
    const [keep, merge] = await Promise.all([
      prisma.runner.findUnique({ where: { slug: keepSlug }, include: { results: true } }),
      prisma.runner.findUnique({ where: { slug: mergeSlug }, include: { results: true } }),
    ]);
    if (!keep) throw new Error(`No runner with slug "${keepSlug}"`);
    if (!merge) throw new Error(`No runner with slug "${mergeSlug}"`);

    const keepByKey = new Map(keep.results.map((r) => [`${r.eventId}:${r.category}`, r]));
    const toReassign: typeof merge.results = [];
    let droppedCount = 0;
    for (const r of merge.results) {
      const existing = keepByKey.get(`${r.eventId}:${r.category}`);
      if (!existing) {
        toReassign.push(r);
        continue;
      }
      // Same event+category on both sides — only safe to silently drop the
      // duplicate row (rather than requiring manual cleanup) if every field
      // matches, i.e. it's the same result entered under both spellings.
      const identical =
        existing.result === r.result &&
        existing.rawTime === r.rawTime &&
        existing.predictedTime === r.predictedTime &&
        existing.position === r.position &&
        existing.points === r.points &&
        existing.isVolunteer === r.isVolunteer;
      if (!identical) {
        throw new Error(
          `Cannot merge: "${keep.name}" and "${merge.name}" have DIFFERENT results for the same event+category (eventId ${r.eventId}, ${r.category}) — resolve that conflict manually first.`,
        );
      }
      droppedCount++;
    }

    if (toReassign.length > 0) {
      await prisma.gpResult.updateMany({
        where: { id: { in: toReassign.map((r) => r.id) } },
        data: { runnerId: keep.id },
      });
    }
    if (droppedCount > 0) {
      await prisma.gpResult.deleteMany({ where: { runnerId: merge.id } });
    }
    await prisma.runner.delete({ where: { id: merge.id } });
    console.log(
      `Merged "${merge.name}" (slug: ${mergeSlug}) into "${keep.name}" (slug: ${keepSlug}): reassigned ${toReassign.length} result(s), dropped ${droppedCount} identical duplicate(s), deleted the runner.`,
    );
    return;
  }

  const write = process.argv.includes("--write");
  const warnings: string[] = [];

  if (GP_SHEET_PUBLISH_BASE.includes("REPLACE_WITH") || EVENTS_TAB_GID.includes("REPLACE_WITH")) {
    throw new Error(
      "scripts/gp-sheet-config.ts still has placeholder values — fill in GP_SHEET_PUBLISH_BASE, EVENTS_TAB_GID, and RACE_TABS once the CGP sheet is published to the web.",
    );
  }

  console.log("Fetching Events tab...");
  const eventsCsv = await fetchCsv(EVENTS_TAB_GID);
  const events = parseEventsTab(eventsCsv, warnings);

  console.log(`Fetching ${RACE_TABS.length} race tab(s)...`);
  const raceTabs: RaceTabResult[] = [];
  for (const tab of RACE_TABS) {
    const csvText = await fetchCsv(tab.gid);
    raceTabs.push({ tabName: tab.name, results: parseRaceTab(csvText, tab.name, warnings) });
  }

  console.log("Running sanity checks...");
  sanityCheck(events, raceTabs, warnings);
  console.log("Sanity checks passed.");

  const existingRunners = await prisma.runner.findMany();
  const renameCandidates = detectRenameCandidates(raceTabs, existingRunners);
  if (renameCandidates.length > 0) {
    console.log(
      `\n${renameCandidates.length} existing runner(s) weren't found under their current name in this batch — possible sheet spelling fix:`,
    );
    for (const c of renameCandidates) {
      console.log(
        `  "${c.oldRunner.name}" (slug: ${c.oldRunner.slug}) looks like it's now "${c.newName}" (edit distance ${c.distance})`,
      );
    }
    console.log(
      '  If confirmed, run `npx tsx scripts/import-gp.ts --rename-runner <slug> "<New Name>"` for each, then re-run this import so results attach to the same runner instead of a new one.\n',
    );
  }

  const report = buildReport(events, raceTabs);
  const reportPath = path.join(__dirname, "import-gp-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Parsed ${events.length} events, ${report.totalResults} results.`);
  console.log(`Report written to ${reportPath}`);

  if (!write) {
    console.log("\nDry run only — no database writes made. Review the report, then re-run with --write.");
    return;
  }

  console.log("\nWriting to database...");

  const distanceRows = await prisma.distance.findMany();
  const distanceIdBySlug = new Map(distanceRows.map((d) => [d.slug, d.id]));

  const existingEventSlugs = new Set((await prisma.gpEvent.findMany({ select: { slug: true } })).map((e) => e.slug));
  const eventIdByName = new Map<string, string>();

  for (const [i, e] of events.entries()) {
    const existing = await prisma.gpEvent.findFirst({ where: { name: e.name } });
    const slug = existing?.slug ?? uniqueSlug(e.name, existingEventSlugs);
    const row = await prisma.gpEvent.upsert({
      where: { slug },
      update: {
        name: e.name,
        date: e.date!,
        distanceId: e.distanceSlug ? distanceIdBySlug.get(e.distanceSlug) : null,
        scoringType: e.scoringType!,
        isSussexGp: e.isSussexGp,
        sortOrder: i,
      },
      create: {
        slug,
        name: e.name,
        date: e.date!,
        distanceId: e.distanceSlug ? distanceIdBySlug.get(e.distanceSlug) : null,
        scoringType: e.scoringType!,
        isSussexGp: e.isSussexGp,
        sortOrder: i,
      },
    });
    eventIdByName.set(normalizeWhitespace(e.name), row.id);
  }
  console.log(`Wrote ${events.length} events to the database.`);

  // Resolve/create runners by normalized-name match, in memory, so hand-typed
  // spelling/whitespace variants across tabs collapse onto one Runner rather
  // than creating a fresh row per tab. (`existingRunners` was already fetched
  // above for rename-candidate detection.)
  const runnerByNormalizedName = new Map(existingRunners.map((r) => [normalizeRunnerName(r.name), r]));
  const takenRunnerSlugs = new Set(existingRunners.map((r) => r.slug));

  let resultCount = 0;
  for (const tab of raceTabs) {
    const eventId = eventIdByName.get(normalizeWhitespace(tab.tabName));
    if (!eventId) continue;

    for (const r of tab.results) {
      if (!r.category) continue;
      const key = normalizeRunnerName(r.runnerName);
      let runner = runnerByNormalizedName.get(key);
      if (!runner) {
        runner = await prisma.runner.create({
          data: { name: r.runnerName, slug: uniqueSlug(r.runnerName, takenRunnerSlugs) },
        });
        runnerByNormalizedName.set(key, runner);
      }

      await prisma.gpResult.upsert({
        where: { eventId_runnerId_category: { eventId, runnerId: runner.id, category: r.category } },
        update: {
          result: r.result,
          rawTime: r.rawTime,
          predictedTime: r.predictedTime,
          position: r.position,
          points: r.points,
          isVolunteer: r.isVolunteer,
        },
        create: {
          eventId,
          runnerId: runner.id,
          category: r.category,
          result: r.result,
          rawTime: r.rawTime,
          predictedTime: r.predictedTime,
          position: r.position,
          points: r.points,
          isVolunteer: r.isVolunteer,
        },
      });
      resultCount++;
    }
  }
  console.log(`Wrote ${resultCount} results to the database.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

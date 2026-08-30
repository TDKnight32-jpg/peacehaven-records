import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  parseEventsTab,
  parseRaceTab,
  type ParsedGpEvent,
  type ParsedGpResult,
} from "../lib/gp-csv-parser";
import { normalizeRunnerName } from "../lib/runner-match";
import { normalizeWhitespace } from "../lib/text";
import { uniqueSlug } from "../lib/slug";
import { GP_SHEET_PUBLISH_BASE, EVENTS_TAB_GID, RACE_TABS } from "./gp-sheet-config";
import { prisma } from "../lib/db";

async function fetchCsv(gid: string): Promise<string> {
  const res = await fetch(`${GP_SHEET_PUBLISH_BASE}&gid=${gid}`);
  if (!res.ok) throw new Error(`Failed to fetch CSV (gid=${gid}): ${res.status} ${res.statusText}`);
  return res.text();
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
  // than creating a fresh row per tab.
  const existingRunners = await prisma.runner.findMany();
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

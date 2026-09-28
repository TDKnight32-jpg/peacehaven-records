import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db";

/**
 * Snapshots every table to `backups/db-<timestamp>.json` — a stand-in for
 * pg_dump (not installed locally) to run before any risky database change.
 * Read-only against the database. The output contains runner emails, so
 * `backups/` is gitignored and must never be committed.
 */
async function main() {
  const tables = {
    distance: await prisma.distance.findMany(),
    footnote: await prisma.footnote.findMany(),
    recordEntry: await prisma.recordEntry.findMany(),
    recordHistoryEntry: await prisma.recordHistoryEntry.findMany(),
    runner: await prisma.runner.findMany(),
    gpEvent: await prisma.gpEvent.findMany(),
    gpResult: await prisma.gpResult.findMany(),
    cohort: await prisma.cohort.findMany(),
    cohortRunner: await prisma.cohortRunner.findMany(),
    c25kWeek: await prisma.c25kWeek.findMany(),
    c25kSession: await prisma.c25kSession.findMany(),
    runnerProgress: await prisma.runnerProgress.findMany(),
    badge: await prisma.badge.findMany(),
    runnerBadge: await prisma.runnerBadge.findMany(),
  };

  const dir = path.join(__dirname, "..", "backups");
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = path.join(dir, `db-${stamp}.json`);
  writeFileSync(file, JSON.stringify(tables, null, 2));

  console.log(`Backup written to ${file}`);
  for (const [name, rows] of Object.entries(tables)) console.log(`  ${name}: ${rows.length} rows`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

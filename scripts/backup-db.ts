import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/db";

/**
 * Snapshots every table to `backups/db-<timestamp>.json` — a stand-in for
 * pg_dump (not installed locally) to run before any risky database change.
 * Read-only against the database. The output contains runner emails, so
 * `backups/` is gitignored and must never be committed.
 *
 * Reads tables straight from the database (not via the generated Prisma
 * models), so it captures exactly what's there — including columns or
 * tables the code doesn't know about yet, e.g. mid-migration.
 */
async function main() {
  const tableRows = await prisma.$queryRaw<{ table_name: string }[]>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name`;

  const tables: Record<string, unknown[]> = {};
  for (const { table_name } of tableRows) {
    // Names come from the database's own catalogue, not user input.
    tables[table_name] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table_name.replace(/"/g, '""')}"`);
  }

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

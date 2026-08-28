import { writeFileSync } from "node:fs";
import path from "node:path";
import { parseSheet, type ParsedRecord, type ParsedFootnote } from "../lib/csv-parser";
import { DISTANCES } from "../lib/distances";
import { prisma } from "../lib/db";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSFnaq0-Sg-b0RvsZJXdJh-0h1TdpqGoz89_K8pfXnr51Z9CkeXH0vDGk0xsXTgx3QzEs_v1-n-Hll5/pub?output=csv&gid=1959397949";

async function fetchCsv(): Promise<string> {
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
  return res.text();
}

/**
 * Fails loudly (throws) rather than letting a bad parse silently reach the
 * DB. Checks structural coverage independently of the parser's own logic:
 * every distance/gender must have produced an age-group section with all 5
 * categories, an overall section, and a rank-1 row for every one of those —
 * plus every warning the parser raised (duplicate/missing sections,
 * unresolved footnotes, structural drift) is treated as fatal here.
 */
function sanityCheck(records: ParsedRecord[], warnings: string[]) {
  const errors: string[] = warnings.map((w) => `parser warning: ${w}`);

  const ageDistancesSeen: Record<"F" | "M", Set<string>> = { F: new Set(), M: new Set() };
  const overallDistancesSeen: Record<"F" | "M", Set<string>> = { F: new Set(), M: new Set() };
  const categoriesSeen = new Map<string, Set<string>>(); // `${slug}:${gender}` -> categories
  const rank1Keys = new Set<string>();

  for (const r of records) {
    if (r.recordType === "AGE_GROUP") {
      ageDistancesSeen[r.gender].add(r.distanceSlug);
      const key = `${r.distanceSlug}:${r.gender}`;
      if (!categoriesSeen.has(key)) categoriesSeen.set(key, new Set());
      if (r.ageCategory) categoriesSeen.get(key)!.add(r.ageCategory);
      if (r.rank === 1) rank1Keys.add(`AGE:${r.distanceSlug}:${r.gender}:${r.ageCategory}`);
    } else {
      overallDistancesSeen[r.gender].add(r.distanceSlug);
      if (r.rank === 1) rank1Keys.add(`OVERALL:${r.distanceSlug}:${r.gender}`);
    }
  }

  for (const dist of DISTANCES) {
    for (const gender of ["F", "M"] as const) {
      if (!ageDistancesSeen[gender].has(dist.slug)) {
        errors.push(`Missing age-group section for ${dist.slug} (${gender})`);
      } else {
        const cats = categoriesSeen.get(`${dist.slug}:${gender}`);
        if (!cats || cats.size !== 5) {
          errors.push(`Expected 5 age categories for ${dist.slug} (${gender}), found ${cats?.size ?? 0}`);
        } else {
          for (const cat of cats) {
            if (!rank1Keys.has(`AGE:${dist.slug}:${gender}:${cat}`)) {
              errors.push(`Missing rank-1 row for ${dist.slug} (${gender}) category "${cat}"`);
            }
          }
        }
      }
      if (!overallDistancesSeen[gender].has(dist.slug)) {
        errors.push(`Missing overall section for ${dist.slug} (${gender})`);
      } else if (!rank1Keys.has(`OVERALL:${dist.slug}:${gender}`)) {
        errors.push(`Missing rank-1 OVERALL row for ${dist.slug} (${gender})`);
      }
    }
  }

  // Structural floor: every (distance, gender) contributes at least 5 age-group
  // rank-1 rows + 1 overall rank-1 row, even if every slot is empty.
  const expectedMin = DISTANCES.length * 2 * (5 + 1);
  if (records.length < expectedMin) {
    errors.push(
      `Total record count ${records.length} is below the structural minimum ${expectedMin} — the scanner likely skipped a section`,
    );
  }

  if (errors.length > 0) {
    throw new Error(`Import sanity check failed (${errors.length} issue(s)):\n- ${errors.join("\n- ")}`);
  }
}

function buildReport(records: ParsedRecord[], footnotes: ParsedFootnote[]) {
  type Bucket = { filled: number; empty: number };
  const counts: Record<string, { AGE_GROUP: Record<Gender, Record<string, Bucket>>; OVERALL: Record<Gender, Bucket> }> = {};
  type Gender = "F" | "M";

  for (const d of DISTANCES) {
    counts[d.slug] = {
      AGE_GROUP: { F: {}, M: {} },
      OVERALL: { F: { filled: 0, empty: 0 }, M: { filled: 0, empty: 0 } },
    };
  }

  for (const r of records) {
    if (r.rank !== 1 && !r.name) continue; // only rank-1 placeholders represent "no record"; skip non-existent slots
    if (r.recordType === "AGE_GROUP") {
      const cat = r.ageCategory ?? "?";
      const bucket = (counts[r.distanceSlug].AGE_GROUP[r.gender][cat] ??= { filled: 0, empty: 0 });
      if (r.name) bucket.filled++;
      else bucket.empty++;
    } else {
      const bucket = counts[r.distanceSlug].OVERALL[r.gender];
      if (r.name) bucket.filled++;
      else bucket.empty++;
    }
  }

  const curated: ParsedRecord[] = [];
  for (const slug of ["1-mile", "10-mile", "marathon", "back-yard-ultra"]) {
    const match = records.find((r) => r.distanceSlug === slug && r.name);
    if (match) curated.push(match);
  }
  const footnoted = records.filter((r) => r.footnoteText);
  curated.push(...footnoted.slice(0, 3));
  const overallSample = records.find((r) => r.recordType === "OVERALL" && r.name);
  if (overallSample) curated.push(overallSample);
  const lapsSample = records.find((r) => r.laps != null);
  if (lapsSample) curated.push(lapsSample);

  return {
    totalRecords: records.length,
    footnotes,
    counts,
    samples: curated,
  };
}

async function main() {
  const write = process.argv.includes("--write");

  console.log(`Fetching CSV...`);
  const csvText = await fetchCsv();

  console.log("Parsing...");
  const { records, footnotes, warnings } = parseSheet(csvText);

  console.log("Running sanity checks...");
  sanityCheck(records, warnings);
  console.log("Sanity checks passed.");

  const report = buildReport(records, footnotes);
  const reportPath = path.join(__dirname, "import-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Parsed ${records.length} records, ${footnotes.length} footnotes.`);
  console.log(`Report written to ${reportPath}`);

  if (!write) {
    console.log("\nDry run only — no database writes made. Review the report, then re-run with --write.");
    return;
  }

  console.log("\nWriting to database...");

  for (const dist of DISTANCES) {
    await prisma.distance.upsert({
      where: { slug: dist.slug },
      update: { name: dist.name, unit: dist.unit, sortOrder: dist.sortOrder },
      create: { slug: dist.slug, name: dist.name, unit: dist.unit, sortOrder: dist.sortOrder },
    });
  }
  const distanceRows = await prisma.distance.findMany();
  const distanceIdBySlug = new Map(distanceRows.map((d) => [d.slug, d.id]));

  const footnoteIdByText = new Map<string, string>();
  for (const f of footnotes) {
    const row = await prisma.footnote.upsert({
      where: { text: f.text },
      update: { symbol: f.symbol },
      create: { text: f.text, symbol: f.symbol },
    });
    footnoteIdByText.set(f.text, row.id);
  }

  for (const r of records) {
    const distanceId = distanceIdBySlug.get(r.distanceSlug);
    if (!distanceId) continue;
    const footnoteId = r.footnoteText ? footnoteIdByText.get(r.footnoteText) ?? null : null;

    await prisma.recordEntry.upsert({
      where: {
        distanceId_gender_recordType_ageCategory_rank: {
          distanceId,
          gender: r.gender,
          recordType: r.recordType,
          ageCategory: r.ageCategory ?? "",
          rank: r.rank,
        },
      },
      update: {
        name: r.name,
        time: r.time,
        laps: r.laps,
        event: r.event,
        date: r.date,
        footnoteId,
      },
      create: {
        distanceId,
        gender: r.gender,
        recordType: r.recordType,
        ageCategory: r.ageCategory ?? "",
        rank: r.rank,
        name: r.name,
        time: r.time,
        laps: r.laps,
        event: r.event,
        date: r.date,
        footnoteId,
      },
    });
  }

  console.log(`Wrote ${records.length} records to the database.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

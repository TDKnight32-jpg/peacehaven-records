import { writeFileSync } from "node:fs";
import path from "node:path";
import {
  parseSheet,
  HISTORY_DISTANCE_SLUGS,
  type ParsedRecord,
  type ParsedFootnote,
  type ParsedHistoryEntry,
} from "../lib/csv-parser";
import { DISTANCES } from "../lib/distances";
import { prisma } from "../lib/db";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSFnaq0-Sg-b0RvsZJXdJh-0h1TdpqGoz89_K8pfXnr51Z9CkeXH0vDGk0xsXTgx3QzEs_v1-n-Hll5/pub?gid=1959397949&single=true&output=csv";

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
function sanityCheck(records: ParsedRecord[], history: ParsedHistoryEntry[], warnings: string[]) {
  const errors: string[] = warnings.map((w) => `parser warning: ${w}`);

  const ageDistancesSeen: Record<"F" | "M", Set<string>> = { F: new Set(), M: new Set() };
  const overallDistancesSeen: Record<"F" | "M", Set<string>> = { F: new Set(), M: new Set() };
  const categoriesSeen = new Map<string, Set<string>>(); // `${slug}:${gender}` -> categories
  const rank1Keys = new Set<string>();
  const overallRank1ByKey = new Map<string, ParsedRecord>(); // `${slug}:${gender}` -> the OVERALL rank-1 row

  for (const r of records) {
    if (r.recordType === "AGE_GROUP") {
      ageDistancesSeen[r.gender].add(r.distanceSlug);
      const key = `${r.distanceSlug}:${r.gender}`;
      if (!categoriesSeen.has(key)) categoriesSeen.set(key, new Set());
      if (r.ageCategory) categoriesSeen.get(key)!.add(r.ageCategory);
      if (r.rank === 1) rank1Keys.add(`AGE:${r.distanceSlug}:${r.gender}:${r.ageCategory}`);
    } else {
      overallDistancesSeen[r.gender].add(r.distanceSlug);
      if (r.rank === 1) {
        rank1Keys.add(`OVERALL:${r.distanceSlug}:${r.gender}`);
        overallRank1ByKey.set(`${r.distanceSlug}:${r.gender}`, r);
      }
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

  // History: every tracked distance/gender must have a non-empty, gap-free
  // 1..N ordering, and its most recent entry must agree with the current
  // OVERALL record — the sheet treats the latest history row as "now holds
  // it", so a mismatch means the parse (or the sheet) has drifted.
  for (const slug of HISTORY_DISTANCE_SLUGS) {
    for (const gender of ["F", "M"] as const) {
      const entries = history
        .filter((h) => h.distanceSlug === slug && h.gender === gender)
        .sort((a, b) => a.order - b.order);
      if (entries.length === 0) {
        errors.push(`Missing history entries for ${slug} (${gender})`);
        continue;
      }
      entries.forEach((h, i) => {
        if (h.order !== i + 1) {
          errors.push(`Non-contiguous history order for ${slug} (${gender}): got ${h.order} at position ${i + 1}`);
        }
      });

      const latest = entries[entries.length - 1];
      const overall = overallRank1ByKey.get(`${slug}:${gender}`);
      if (overall?.name && (overall.name !== latest.name || overall.time !== latest.time)) {
        errors.push(
          `History's latest holder for ${slug} (${gender}) is "${latest.name}" ${latest.time}, but the current OVERALL record is "${overall.name}" ${overall.time}`,
        );
      }
    }
  }
  for (const h of history) {
    if (!(HISTORY_DISTANCE_SLUGS as readonly string[]).includes(h.distanceSlug)) {
      errors.push(`History entry for unexpected distance "${h.distanceSlug}" — not in HISTORY_DISTANCE_SLUGS`);
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

function buildReport(records: ParsedRecord[], footnotes: ParsedFootnote[], history: ParsedHistoryEntry[]) {
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

  const historyByDistance: Record<string, { F: ParsedHistoryEntry[]; M: ParsedHistoryEntry[] }> = {};
  for (const slug of HISTORY_DISTANCE_SLUGS) historyByDistance[slug] = { F: [], M: [] };
  for (const h of history) {
    (historyByDistance[h.distanceSlug] ??= { F: [], M: [] })[h.gender].push(h);
  }
  for (const bySlug of Object.values(historyByDistance)) {
    bySlug.F.sort((a, b) => a.order - b.order);
    bySlug.M.sort((a, b) => a.order - b.order);
  }

  return {
    totalRecords: records.length,
    footnotes,
    counts,
    samples: curated,
    history: historyByDistance,
  };
}

async function main() {
  const write = process.argv.includes("--write");

  console.log(`Fetching CSV...`);
  const csvText = await fetchCsv();

  console.log("Parsing...");
  const { records, footnotes, history, warnings } = parseSheet(csvText);

  console.log("Running sanity checks...");
  sanityCheck(records, history, warnings);
  console.log("Sanity checks passed.");

  const report = buildReport(records, footnotes, history);
  const reportPath = path.join(__dirname, "import-report.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Parsed ${records.length} records, ${footnotes.length} footnotes, ${history.length} history entries.`);
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

  // Full replace rather than upsert: history rows have no external references
  // and re-deriving `order` from scratch each run is simpler than reconciling
  // insertions/removals in the middle of a progression.
  const historyDistanceIds = HISTORY_DISTANCE_SLUGS.map((slug) => distanceIdBySlug.get(slug)).filter(
    (id): id is string => Boolean(id),
  );
  await prisma.recordHistoryEntry.deleteMany({ where: { distanceId: { in: historyDistanceIds } } });
  for (const h of history) {
    const distanceId = distanceIdBySlug.get(h.distanceSlug);
    if (!distanceId) continue;
    await prisma.recordHistoryEntry.create({
      data: {
        distanceId,
        gender: h.gender,
        order: h.order,
        name: h.name,
        time: h.time,
        event: h.event,
        date: h.date,
      },
    });
  }
  console.log(`Wrote ${history.length} history entries to the database.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

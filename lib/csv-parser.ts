import { parse } from "csv-parse/sync";
import { DISTANCES, matchDistance, normalizeCategory } from "./distances";

export type Gender = "M" | "F";
export type RecordType = "AGE_GROUP" | "OVERALL";

export interface ParsedRecord {
  distanceSlug: string;
  gender: Gender;
  recordType: RecordType;
  ageCategory: string | null;
  rank: number;
  name: string | null;
  time: string | null;
  laps: number | null;
  event: string | null;
  date: Date | null;
  footnoteText: string | null;
}

export interface ParsedFootnote {
  text: string;
  /** Display marker, e.g. "**" — informational only, see schema comment. */
  symbol: string;
}

export interface ParsedHistoryEntry {
  distanceSlug: string;
  gender: Gender;
  /** Chronological, ascending — 1 is the earliest known holder; the highest
   * order per (distance, gender) is the current record. */
  order: number;
  name: string;
  time: string;
  event: string | null;
  date: Date | null;
}

/** Distances the sheet tracks a "records history" progression for — the
 * rest (1 mile, ultras, Back Yard Ultra) simply have no history section. */
export const HISTORY_DISTANCE_SLUGS = [
  "5k",
  "10k",
  "10-mile",
  "half-marathon",
  "20-mile",
  "marathon",
] as const;

export interface ParseResult {
  records: ParsedRecord[];
  footnotes: ParsedFootnote[];
  history: ParsedHistoryEntry[];
  warnings: string[];
}

function cellAt(rows: string[][], r: number, c: number): string {
  const v = rows[r]?.[c];
  return v === undefined || v === null ? "" : String(v).trim();
}

// ---- Footnote legend extraction -------------------------------------------------

interface FootnoteCandidate {
  stars: number;
  text: string;
}

/** Matches a footnote *definition* cell, e.g. "*** Gun Timed Event" or the
 * glitchy "* *Mince Pie 10 has been measured as 10.25 miles." (stray space
 * inside the marker) — counts '*' chars in the leading run, ignoring
 * interspersed whitespace, so both variants of the same definition collapse
 * to the same star count. */
function extractFootnoteCandidate(raw: string): FootnoteCandidate | null {
  const s = raw.trim();
  if (!s.startsWith("*")) return null;
  let i = 0;
  let stars = 0;
  while (i < s.length && (s[i] === "*" || s[i] === " ")) {
    if (s[i] === "*") stars++;
    i++;
  }
  const text = s.slice(i).trim();
  if (!text || stars === 0) return null;
  return { stars, text };
}

function extractFootnotes(rows: string[][]): ParsedFootnote[] {
  const candidates: FootnoteCandidate[] = [];
  for (const row of rows) {
    for (const cell of row) {
      const c = extractFootnoteCandidate(cell ?? "");
      if (c) candidates.push(c);
    }
  }
  const byText = new Map<string, FootnoteCandidate[]>();
  for (const c of candidates) {
    const key = c.text.toLowerCase();
    if (!byText.has(key)) byText.set(key, []);
    byText.get(key)!.push(c);
  }
  return [...byText.values()].map((group) => {
    const counts = new Map<number, number>();
    for (const c of group) counts.set(c.stars, (counts.get(c.stars) ?? 0) + 1);
    const bestStars = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
    return { text: group[0].text, symbol: "*".repeat(bestStars) };
  });
}

/** Splits a trailing marker (e.g. "Seaford 10K***") off an event/location string. */
function stripMarker(event: string): { base: string; stars: number } {
  const m = event.match(/^(.*?)\s*(\*{1,3})\s*$/);
  if (!m) return { base: event.trim(), stars: 0 };
  return { base: m[1].trim(), stars: m[2].length };
}

/** Resolves a stripped marker back to a footnote definition. The sheet reuses
 * "**" for two unrelated footnotes (Mince Pie 10 / Beachy Head Ultra distance
 * clarifications), so we first try matching by content (does the footnote
 * text mention a distinctive word from the event name?), then fall back to a
 * symbol match — which only works when exactly one footnote shares that
 * star count (true for "***" / Gun Timed Event, which isn't tied to one
 * event name). */
function resolveFootnote(
  base: string,
  stars: number,
  footnotes: ParsedFootnote[],
): ParsedFootnote | undefined {
  if (stars === 0) return undefined;
  const words = base
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3);
  const contentMatch = footnotes.find((f) => {
    const textLower = f.text.toLowerCase();
    return words.some((w) => textLower.includes(w));
  });
  if (contentMatch) return contentMatch;
  const symbolMatches = footnotes.filter((f) => f.symbol.length === stars);
  return symbolMatches.length === 1 ? symbolMatches[0] : undefined;
}

// ---- Date parsing -----------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Handles "2-Apr-26" and the occasional "01-Mar.26" typo (period instead of dash). */
function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/[.\s]+/g, "-").replace(/-+/g, "-");
  const m = cleaned.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const mon = MONTHS[m[2].toLowerCase()];
  if (mon === undefined) return null;
  let year = parseInt(m[3], 10);
  if (year < 100) year += 2000;
  return new Date(Date.UTC(year, mon, day, 12, 0, 0));
}

// ---- Age-group block (per gender, 5 columns: Category/Name/Time/Event/Date) -------

/** Every age-group section in the sheet is exactly: 1 title row, 1 "Category"
 * column-header row, then 15 data rows (5 categories x 3 ranks) — verified by
 * hand across all 12 distances. We scan for the title (matched distance name
 * followed by a literal "Category" row) rather than hardcoding row numbers,
 * so the importer tolerates rows being inserted elsewhere in the sheet later. */
function parseAgeGroupBlock(
  rows: string[][],
  gender: Gender,
  catCol: number,
  nameCol: number,
  valueCol: number,
  eventCol: number,
  dateCol: number,
  footnotes: ParsedFootnote[],
  warnings: string[],
): ParsedRecord[] {
  const out: ParsedRecord[] = [];
  const seenDistances = new Set<string>();
  let r = 0;
  while (r < rows.length) {
    const label = cellAt(rows, r, catCol);
    const dist = label ? matchDistance(label) : undefined;
    const nextIsHeader = cellAt(rows, r + 1, catCol).toLowerCase() === "category";

    if (dist && nextIsHeader) {
      if (seenDistances.has(dist.slug)) {
        warnings.push(`Duplicate age-group section for ${dist.slug} (${gender}) at row ${r + 1}`);
      }
      seenDistances.add(dist.slug);

      const dataStart = r + 2;
      for (let chunk = 0; chunk < 5; chunk++) {
        const chunkStart = dataStart + chunk * 3;
        const rawCat =
          cellAt(rows, chunkStart, catCol) ||
          cellAt(rows, chunkStart + 1, catCol) ||
          cellAt(rows, chunkStart + 2, catCol);
        if (!rawCat) {
          warnings.push(
            `Missing age-category label for ${dist.slug} (${gender}) chunk ${chunk} at row ${chunkStart + 1}`,
          );
          continue;
        }
        const category = normalizeCategory(rawCat);

        for (let rank = 1; rank <= 3; rank++) {
          const rowIdx = chunkStart + (rank - 1);
          const name = cellAt(rows, rowIdx, nameCol) || null;

          if (!name) {
            if (rank === 1) {
              out.push({
                distanceSlug: dist.slug,
                gender,
                recordType: "AGE_GROUP",
                ageCategory: category,
                rank: 1,
                name: null,
                time: null,
                laps: null,
                event: null,
                date: null,
                footnoteText: null,
              });
            }
            continue;
          }

          const rawValue = cellAt(rows, rowIdx, valueCol);
          const rawEvent = cellAt(rows, rowIdx, eventCol);
          const rawDate = cellAt(rows, rowIdx, dateCol);
          const { base, stars } = stripMarker(rawEvent);
          const footnote = stars > 0 ? resolveFootnote(base, stars, footnotes) : undefined;
          if (stars > 0 && !footnote) {
            warnings.push(
              `Unresolved footnote marker on "${rawEvent}" (${dist.slug} ${gender} ${category} rank ${rank})`,
            );
          }

          out.push({
            distanceSlug: dist.slug,
            gender,
            recordType: "AGE_GROUP",
            ageCategory: category,
            rank,
            name,
            time: dist.unit === "laps" ? null : rawValue || null,
            laps: dist.unit === "laps" ? (rawValue ? parseInt(rawValue, 10) : null) : null,
            event: base || null,
            date: parseDate(rawDate),
            footnoteText: footnote ? footnote.text : null,
          });
        }
      }

      r = dataStart + 15;
      if (cellAt(rows, r, catCol).toLowerCase() === "category") {
        warnings.push(
          `Structural check failed: found another "Category" header immediately after ${dist.slug} (${gender}) — the fixed 15-row section assumption may no longer hold`,
        );
      }
      continue;
    }

    r++;
  }
  return out;
}

// ---- Overall block (shared columns, two stacked gender tables) --------------------

/** Unlike the age-group blocks, distance groups here aren't fixed-length —
 * we scan for runs of consecutive rows sharing the same distance label
 * (verified to always be 3 in practice) rather than assuming it. */
function parseOverallBlock(
  rows: string[][],
  catCol: number,
  nameCol: number,
  valueCol: number,
  eventCol: number,
  dateCol: number,
  footnotes: ParsedFootnote[],
  warnings: string[],
): ParsedRecord[] {
  const out: ParsedRecord[] = [];
  let gender: Gender | null = null;
  const seen: Record<Gender, Set<string>> = { F: new Set(), M: new Set() };
  let r = 0;

  while (r < rows.length) {
    const label = cellAt(rows, r, catCol);

    if (/women.?s\s+overall\s+records/i.test(label)) {
      gender = "F";
      r += 2; // title row + "Category" header row
      continue;
    }
    if (/men.?s\s+overall\s+records/i.test(label)) {
      gender = "M";
      r += 2;
      continue;
    }

    if (gender && label) {
      const dist = matchDistance(label);
      if (dist) {
        if (seen[gender].has(dist.slug)) {
          warnings.push(`Duplicate overall section for ${dist.slug} (${gender}) at row ${r + 1}`);
        }
        seen[gender].add(dist.slug);

        let runLen = 0;
        while (cellAt(rows, r + runLen, catCol) === label) runLen++;
        if (runLen !== 3) {
          warnings.push(
            `Unexpected overall-block run length ${runLen} (expected 3) for "${label}" (${gender}) at row ${r + 1}`,
          );
        }

        let sawRank1 = false;
        for (let rank = 1; rank <= Math.min(runLen, 3); rank++) {
          const rowIdx = r + (rank - 1);
          const name = cellAt(rows, rowIdx, nameCol) || null;

          if (!name) {
            if (rank === 1) {
              sawRank1 = true;
              out.push({
                distanceSlug: dist.slug,
                gender,
                recordType: "OVERALL",
                ageCategory: null,
                rank: 1,
                name: null,
                time: null,
                laps: null,
                event: null,
                date: null,
                footnoteText: null,
              });
            }
            continue;
          }
          if (rank === 1) sawRank1 = true;

          const rawValue = cellAt(rows, rowIdx, valueCol);
          const rawEvent = cellAt(rows, rowIdx, eventCol);
          const rawDate = cellAt(rows, rowIdx, dateCol);
          const { base, stars } = stripMarker(rawEvent);
          const footnote = stars > 0 ? resolveFootnote(base, stars, footnotes) : undefined;
          if (stars > 0 && !footnote) {
            warnings.push(
              `Unresolved footnote marker on "${rawEvent}" (OVERALL ${dist.slug} ${gender} rank ${rank})`,
            );
          }

          out.push({
            distanceSlug: dist.slug,
            gender,
            recordType: "OVERALL",
            ageCategory: null,
            rank,
            name,
            time: dist.unit === "laps" ? null : rawValue || null,
            laps: dist.unit === "laps" ? (rawValue ? parseInt(rawValue, 10) : null) : null,
            event: base || null,
            date: parseDate(rawDate),
            footnoteText: footnote ? footnote.text : null,
          });
        }
        if (!sawRank1) {
          warnings.push(`No rank-1 row produced for OVERALL ${dist.slug} (${gender})`);
        }

        r += Math.max(runLen, 1);
        continue;
      }
    }

    r++;
  }
  return out;
}

// ---- Records history block ---------------------------------------------------------

/** Each history block is 9 columns wide: [women name/time/event/date] (0-3),
 * [men name/time/event/date] (4-7), then a blank separator (8) before the
 * next distance's block. Blocks are found by scanning for a title cell
 * matching "<distance> records history" rather than a fixed column, so this
 * tolerates the block being moved if the sheet is restructured — but unlike
 * the age-group sections, a block's *row extent* isn't fixed (some distances
 * have one historical holder, others several), so each gender's column is
 * walked independently until it goes blank. */
function parseHistoryBlock(
  rows: string[][],
  warnings: string[],
): ParsedHistoryEntry[] {
  const out: ParsedHistoryEntry[] = [];
  const seen = new Set<string>();

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < (rows[r]?.length ?? 0); c++) {
      const cell = cellAt(rows, r, c);
      const m = cell.match(/^(.*?)\s+records\s+history$/i);
      if (!m) continue;

      const dist = matchDistance(m[1]);
      if (!dist) {
        warnings.push(`Unrecognized distance in history title "${cell}" at row ${r + 1}`);
        continue;
      }
      if (seen.has(dist.slug)) {
        warnings.push(`Duplicate history block for ${dist.slug} at row ${r + 1}`);
      }
      seen.add(dist.slug);

      const womenNameCol = c;
      const menNameCol = c + 4;
      const dataStart = r + 2; // title row, then "Women's"/"Men's" subheader row

      const order: Record<Gender, number> = { F: 0, M: 0 };
      let row = dataStart;
      while (row < rows.length) {
        const wName = cellAt(rows, row, womenNameCol);
        const mName = cellAt(rows, row, menNameCol);
        if (!wName && !mName) break;

        if (wName) {
          order.F++;
          out.push({
            distanceSlug: dist.slug,
            gender: "F",
            order: order.F,
            name: wName,
            time: cellAt(rows, row, womenNameCol + 1),
            event: cellAt(rows, row, womenNameCol + 2) || null,
            date: parseDate(cellAt(rows, row, womenNameCol + 3)),
          });
        }
        if (mName) {
          order.M++;
          out.push({
            distanceSlug: dist.slug,
            gender: "M",
            order: order.M,
            name: mName,
            time: cellAt(rows, row, menNameCol + 1),
            event: cellAt(rows, row, menNameCol + 2) || null,
            date: parseDate(cellAt(rows, row, menNameCol + 3)),
          });
        }
        row++;
      }
    }
  }

  for (const slug of HISTORY_DISTANCE_SLUGS) {
    if (!seen.has(slug)) warnings.push(`Missing expected history block for ${slug}`);
  }
  for (const slug of seen) {
    if (!(HISTORY_DISTANCE_SLUGS as readonly string[]).includes(slug)) {
      warnings.push(`Unexpected history block for ${slug} — not in the known set, review HISTORY_DISTANCE_SLUGS`);
    }
  }

  return out;
}

// ---- Entry point --------------------------------------------------------------------

export function parseSheet(csvText: string): ParseResult {
  const rows: string[][] = parse(csvText, {
    relax_column_count: true,
    skip_empty_lines: false,
  });

  const warnings: string[] = [];
  const footnotes = extractFootnotes(rows);

  const womenAge = parseAgeGroupBlock(rows, "F", 1, 2, 3, 4, 5, footnotes, warnings);
  const menAge = parseAgeGroupBlock(rows, "M", 7, 8, 9, 10, 11, footnotes, warnings);
  const overall = parseOverallBlock(rows, 13, 14, 15, 16, 17, footnotes, warnings);
  const history = parseHistoryBlock(rows, warnings);

  return { records: [...womenAge, ...menAge, ...overall], footnotes, history, warnings };
}

export { DISTANCES };

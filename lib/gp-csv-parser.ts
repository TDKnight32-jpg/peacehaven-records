import { parse } from "csv-parse/sync";
import { matchDistance } from "./distances";

export type Category = "M" | "F";
export type ScoringType = "FASTEST_TIME" | "AGE_GRADE" | "NAKED_RUN";

export interface ParsedGpEvent {
  name: string;
  date: Date | null;
  distanceSlug: string | null;
  scoringType: ScoringType | null;
  isSussexGp: boolean;
}

export interface ParsedGpResult {
  runnerName: string;
  category: Category | null;
  result: string | null;
  rawTime: string | null;
  predictedTime: string | null;
  position: number | null;
  points: number | null;
  isVolunteer: boolean;
}

/**
 * The real sheet's exact header text isn't known yet (built ahead of the
 * sheet being shared — see scripts/gp-sheet-config.ts) so headers are matched
 * by alias, case/whitespace-insensitively, rather than hardcoded column
 * indexes. Add the real header text to the relevant alias list if a column
 * doesn't resolve once the sheet is available.
 */
function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function resolveColumns(
  header: string[],
  spec: Record<string, string[]>,
  warnings: string[],
  tabLabel: string,
): Record<string, number> {
  const normalized = header.map(normalizeHeader);
  const resolved: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(spec)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx === -1) {
      warnings.push(`${tabLabel}: no column matched for "${field}" (tried: ${aliases.join(", ")})`);
    } else {
      resolved[field] = idx;
    }
  }
  return resolved;
}

function cell(row: string[], col: number | undefined): string {
  if (col === undefined) return "";
  const v = row[col];
  return v === undefined || v === null ? "" : String(v).trim();
}

// ---- Date parsing -----------------------------------------------------------------

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Tries the club sheet's existing "D-Mon-YY" style, plain ISO, and UK
 * D/M/Y (Sheets' default CSV rendering for typed-in UK dates). Returns null
 * — rather than guessing — on anything else, so a bad date surfaces as a
 * warning instead of silently landing on the wrong day. */
export function parseGpDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  const dashMon = s.replace(/[.\s]+/g, "-").replace(/-+/g, "-").match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (dashMon) {
    const day = parseInt(dashMon[1], 10);
    const mon = MONTHS[dashMon[2].toLowerCase()];
    let year = parseInt(dashMon[3], 10);
    if (year < 100) year += 2000;
    if (mon !== undefined) return new Date(Date.UTC(year, mon, day, 12, 0, 0));
  }

  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return new Date(Date.UTC(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10), 12, 0, 0));
  }

  const ukSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (ukSlash) {
    const day = parseInt(ukSlash[1], 10);
    const month = parseInt(ukSlash[2], 10) - 1;
    let year = parseInt(ukSlash[3], 10);
    if (year < 100) year += 2000;
    return new Date(Date.UTC(year, month, day, 12, 0, 0));
  }

  return null;
}

function parseScoringType(raw: string): ScoringType | null {
  const norm = raw.trim().toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_+|_+$/g, "");
  if (norm === "fastest_time" || norm === "fastest") return "FASTEST_TIME";
  if (norm === "age_grade" || norm === "age_graded") return "AGE_GRADE";
  if (norm === "naked_run" || norm === "naked") return "NAKED_RUN";
  return null;
}

function parseBool(raw: string): boolean {
  return ["y", "yes", "true", "1"].includes(raw.trim().toLowerCase());
}

function parseCategory(raw: string): Category | null {
  const norm = raw.trim().toLowerCase();
  if (["m", "male", "men"].includes(norm)) return "M";
  if (["f", "female", "women"].includes(norm)) return "F";
  return null;
}

function parseIntOrNull(raw: string): number | null {
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

// ---- Events tab ---------------------------------------------------------------------

const EVENTS_COLUMN_SPEC: Record<string, string[]> = {
  name: ["event", "event name", "name"],
  date: ["date"],
  distance: ["distance"],
  scoringType: ["scoring type", "scoring"],
  isSussexGp: ["sussex gp", "is sussex gp", "sussex grand prix"],
};

export function parseEventsTab(csvText: string, warnings: string[]): ParsedGpEvent[] {
  const rows: string[][] = parse(csvText, { relax_column_count: true, skip_empty_lines: true });
  if (rows.length === 0) return [];

  const cols = resolveColumns(rows[0], EVENTS_COLUMN_SPEC, warnings, "Events tab");
  const out: ParsedGpEvent[] = [];

  for (let r = 1; r < rows.length; r++) {
    const name = cell(rows[r], cols.name);
    if (!name) continue;

    const rawDate = cell(rows[r], cols.date);
    const date = parseGpDate(rawDate);
    if (rawDate && !date) warnings.push(`Events tab row ${r + 1}: unparseable date "${rawDate}" for "${name}"`);

    // GP races legitimately run distances the club-records feature doesn't
    // track (e.g. an "8K" trail race, or "13.1 miles" instead of "Half
    // Marathon") — an unmatched distance is expected, not an error, so it's
    // left unlinked rather than fed into the fatal `warnings` list.
    const rawDistance = cell(rows[r], cols.distance);
    const distance = rawDistance ? matchDistance(rawDistance) : undefined;

    const rawScoring = cell(rows[r], cols.scoringType);
    const scoringType = parseScoringType(rawScoring);
    if (rawScoring && !scoringType) {
      warnings.push(`Events tab row ${r + 1}: unrecognized scoring type "${rawScoring}" for "${name}"`);
    }

    out.push({
      name,
      date,
      distanceSlug: distance?.slug ?? null,
      scoringType,
      isSussexGp: parseBool(cell(rows[r], cols.isSussexGp)),
    });
  }

  return out;
}

// ---- Race tabs ------------------------------------------------------------------------

const RACE_COLUMN_SPEC: Record<string, string[]> = {
  runner: ["runner"],
  category: ["category"],
  result: ["result"],
  rawTime: ["raw time"],
  predictedTime: ["predicted time"],
  position: ["position"],
  points: ["points"],
  volunteer: ["volunteer"],
};

export function parseRaceTab(csvText: string, tabLabel: string, warnings: string[]): ParsedGpResult[] {
  const rows: string[][] = parse(csvText, { relax_column_count: true, skip_empty_lines: true });
  if (rows.length === 0) return [];

  const cols = resolveColumns(rows[0], RACE_COLUMN_SPEC, warnings, `Race tab "${tabLabel}"`);
  const out: ParsedGpResult[] = [];

  for (let r = 1; r < rows.length; r++) {
    const runnerName = cell(rows[r], cols.runner);
    if (!runnerName) continue;

    const rawCategory = cell(rows[r], cols.category);
    const category = parseCategory(rawCategory);
    if (!category) {
      warnings.push(`Race tab "${tabLabel}" row ${r + 1}: unrecognized category "${rawCategory}" for "${runnerName}"`);
    }

    out.push({
      runnerName,
      category,
      result: cell(rows[r], cols.result) || null,
      rawTime: cell(rows[r], cols.rawTime) || null,
      predictedTime: cell(rows[r], cols.predictedTime) || null,
      position: parseIntOrNull(cell(rows[r], cols.position)),
      points: parseIntOrNull(cell(rows[r], cols.points)),
      isVolunteer: parseBool(cell(rows[r], cols.volunteer)),
    });
  }

  return out;
}

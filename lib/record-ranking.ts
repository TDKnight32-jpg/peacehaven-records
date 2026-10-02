import { normalizeWhitespace } from "./text";

// Club records keep the top 3 per list — the same 3 slots the sheet has
// (see lib/csv-parser.ts) and the records page shows.
export const RECORD_LIST_SIZE = 3;

/** "H:MM:SS", "HH:MM:SS" or "MM:SS" → seconds, or null if unparseable. */
export function timeToSeconds(time: string): number | null {
  const parts = time.trim().split(":");
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.map(Number).reduce((total, n) => total * 60 + n, 0);
}

/** Seconds → "HH:MM:SS", the format every record imported from the sheet uses. */
export function formatRecordTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

export interface Performance {
  time: string | null;
  laps: number | null;
}

/** A single comparable number where lower is better: seconds for timed
 * distances, negated laps for Back Yard Ultra (more laps is better).
 * Unparseable or missing performances sort last. */
export function performanceScore(unit: "time" | "laps", p: Performance): number {
  if (unit === "laps") return p.laps != null ? -p.laps : Infinity;
  const seconds = p.time ? timeToSeconds(p.time) : null;
  return seconds ?? Infinity;
}

export interface RankedEntry extends Performance {
  name: string | null;
}

export type Placement<T> =
  /** Would enter the list at `position` (1-based); `list` is the resulting top 3. */
  | { kind: "enters"; position: number; list: (T | "NEW")[] }
  /** Outside the top 3 — `cutoff` is the current last-placed entry. */
  | { kind: "outside"; cutoff: T }
  /** The athlete is already on this list with an equal or better performance. */
  | { kind: "not-improved"; existing: T; existingRank: number };

/**
 * Where a new performance would land in one record list (current entries in
 * rank order, filled slots only). Matches the records page's conventions: one
 * entry per athlete per list (names matched with the same whitespace/case
 * normalization as the GP import), so a faster time from someone already on
 * the list replaces their old entry; and on a tie the existing holder keeps
 * the higher place.
 */
export function placeInList<T extends RankedEntry>(
  unit: "time" | "laps",
  current: T[],
  candidate: RankedEntry & { name: string },
): Placement<T> {
  const score = performanceScore(unit, candidate);
  const name = normalizeWhitespace(candidate.name);
  const ownIndex = current.findIndex((e) => e.name && normalizeWhitespace(e.name) === name);
  if (ownIndex !== -1 && performanceScore(unit, current[ownIndex]) <= score) {
    return { kind: "not-improved", existing: current[ownIndex], existingRank: ownIndex + 1 };
  }

  const others = current.filter((_, i) => i !== ownIndex);
  const index = others.findIndex((e) => performanceScore(unit, e) > score);
  const position = (index === -1 ? others.length : index) + 1;
  if (position > RECORD_LIST_SIZE) return { kind: "outside", cutoff: others[RECORD_LIST_SIZE - 1] };

  const list: (T | "NEW")[] = [...others];
  list.splice(position - 1, 0, "NEW");
  return { kind: "enters", position, list: list.slice(0, RECORD_LIST_SIZE) };
}

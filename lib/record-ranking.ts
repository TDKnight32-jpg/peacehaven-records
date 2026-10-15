import { normalizeWhitespace } from "./text";

// Club records keep the top 3 places per list — the same 3 the sheet has (see
// lib/csv-parser.ts). Exactly equal results share a place (standard
// ranking: joint 1st, joint 1st, 3rd), so a tie for 3rd puts more than 3
// people on a list; see placesOf.
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

/**
 * The place each entry of a list holds, given the entries in their stored
 * order: an entry with exactly the same result as the one above it shares
 * that place, otherwise its place is its position — [10, 10, 8 laps] is
 * 1st, joint 1st, 3rd. Only equal neighbours are joined, so a list is never
 * reordered by this.
 */
export function placesOf(unit: "time" | "laps", entries: Performance[]): number[] {
  const places: number[] = [];
  entries.forEach((e, i) => {
    const tied = i > 0 && performanceScore(unit, e) === performanceScore(unit, entries[i - 1]);
    places.push(tied ? places[i - 1] : i + 1);
  });
  return places;
}

/** Whether the entry at `index` shares its place with another entry. */
export function isJointPlace(places: number[], index: number): boolean {
  return places.filter((p) => p === places[index]).length > 1;
}

const ORDINAL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

/** "1st", or "Joint 1st" when shared. */
export function placeLabel(place: number, joint: boolean): string {
  const ordinal = ORDINAL[place] ?? `${place}th`;
  return joint ? `Joint ${ordinal}` : ordinal;
}

/** What a share card is for, in words: "New record", "Joint record", "2nd" or "Joint 3rd". */
export function cardPlaceText(place: number, joint: boolean): string {
  if (place === 1) return joint ? "Joint record" : "New record";
  return placeLabel(place, joint);
}

export type Placement<T> =
  /** Would enter the list at `position` (its place, 1-based), sharing it with
   * `jointWith` if tied; `list` is the resulting list (everyone placed 3rd or
   * better) and `dropped` whoever that pushes off. */
  | { kind: "enters"; position: number; jointWith: T[]; list: (T | "NEW")[]; dropped: T[] }
  /** Outside the top 3 — `cutoff` is the current last-placed entry; equalling it would get on. */
  | { kind: "outside"; cutoff: T }
  /** The athlete is already on this list with an equal or better performance. */
  | { kind: "not-improved"; existing: T; existingRank: number };

/**
 * Where a new performance would land in one record list (current entries in
 * rank order, filled slots only). Matches the records page's conventions: one
 * entry per athlete per list (names matched with the same whitespace/case
 * normalization as the GP import), so a faster time from someone already on
 * the list replaces their old entry; and an exactly equal result shares the
 * place (listed after the existing holder). Everyone whose place ends up
 * worse than 3rd drops off — tied entries together.
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
  const found = others.findIndex((e) => performanceScore(unit, e) > score);
  const index = found === -1 ? others.length : found;
  const all: (T | "NEW")[] = [...others];
  all.splice(index, 0, "NEW");

  const places = placesOf(unit, all.map((e) => (e === "NEW" ? candidate : e)));
  const position = places[index];
  if (position > RECORD_LIST_SIZE) {
    // The last entry still on the list; ties for it are all on, so any of them will do.
    const othersPlaces = placesOf(unit, others);
    const lastOn = othersPlaces.filter((p) => p <= RECORD_LIST_SIZE).length - 1;
    return { kind: "outside", cutoff: others[lastOn] };
  }

  const list = all.filter((_, i) => places[i] <= RECORD_LIST_SIZE);
  const dropped = all.filter((e, i): e is T => e !== "NEW" && places[i] > RECORD_LIST_SIZE);
  const jointWith = all.filter((e, i): e is T => e !== "NEW" && places[i] === position);
  return { kind: "enters", position, jointWith, list, dropped };
}

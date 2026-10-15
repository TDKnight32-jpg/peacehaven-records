import { prisma } from "./db";
import { GENDER_LABEL, performanceText } from "./record-approval";
import { isJointPlace, placeLabel, placesOf } from "./record-ranking";
import { levenshteinDistance, normalizeWhitespace } from "./text";

// Record lists match athletes by name (normalizeWhitespace — see
// placeInList), so "Sam Barden" and "Samantha Barden" count as two people.
// These helpers find names already on the records that a new name might
// really belong to, for the officials' review and the /submit suggestions.

export interface KnownAthlete {
  /** The spelling on the live lists (or the latest history entry if they're
   * only in the history). */
  name: string;
  gender: "F" | "M";
  /** Where they appear on the live lists, e.g. "Women's Overall Back Yard Ultra joint 1st (10 laps)". */
  appearances: string[];
}

/** Everyone on a live record list or in a record history, one entry per
 * name (as the lists match them) and gender. */
export async function getKnownAthletes(): Promise<KnownAthlete[]> {
  const [entries, history] = await Promise.all([
    prisma.recordEntry.findMany({
      where: { name: { not: null } },
      include: { distance: true },
      orderBy: [{ distance: { sortOrder: "asc" } }, { recordType: "desc" }, { rank: "asc" }],
    }),
    prisma.recordHistoryEntry.findMany({ orderBy: { order: "desc" } }),
  ]);

  const byKey = new Map<string, KnownAthlete>();
  const athlete = (name: string, gender: string) => {
    const key = `${gender}:${normalizeWhitespace(name)}`;
    let a = byKey.get(key);
    if (!a) {
      a = { name: name.trim().replace(/\s+/g, " "), gender: gender as "F" | "M", appearances: [] };
      byKey.set(key, a);
    }
    return a;
  };

  // Places are shared by exactly equal results, so they're worked out per list.
  const lists = new Map<string, typeof entries>();
  for (const e of entries) {
    const key = [e.distanceId, e.gender, e.recordType, e.ageCategory].join("|");
    lists.set(key, [...(lists.get(key) ?? []), e]);
  }
  const placeOf = new Map<string, string>();
  for (const list of lists.values()) {
    const places = placesOf(list[0].distance.unit as "time" | "laps", list);
    list.forEach((e, i) => placeOf.set(e.id, placeLabel(places[i], isJointPlace(places, i)).toLowerCase()));
  }

  for (const e of entries) {
    const list = e.recordType === "OVERALL" ? "Overall" : e.ageCategory;
    athlete(e.name!, e.gender).appearances.push(
      `${GENDER_LABEL[e.gender] ?? e.gender} ${list} ${e.distance.name} ${placeOf.get(e.id)} (${performanceText(e.distance.unit, e)})`,
    );
  }
  for (const h of history) athlete(h.name, h.gender);
  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** Lowercase letters only: the first word, the last word, and all of it run
 * together — so "Wooler-Smith" and "Wooler Smith", "St Louis" and
 * "St louis", or "Ann-Grace Fogerty" and "Ann Fogerty" line up. */
function nameParts(raw: string): { first: string; surname: string; all: string } {
  const words = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean);
  return { first: words[0] ?? "", surname: words.length > 1 ? words[words.length - 1] : "", all: words.join("") };
}

export interface SimilarAthlete extends KnownAthlete {
  /** e.g. "Same surname" or "Similar spelling". */
  reason: string;
}

/**
 * Athletes of the same gender whose name looks like it could be the same
 * person under a different spelling: the same surname (Sam / Samantha
 * Barden, but also family members — the officer decides), or a close
 * spelling of the whole name (Neil Barns / Neil Barnes). Names the lists
 * already treat as the same person aren't included. Closest matches first.
 */
export function findSimilarAthletes(name: string, gender: string, known: KnownAthlete[]): SimilarAthlete[] {
  const target = nameParts(name);
  const normalized = normalizeWhitespace(name);
  if (!target.all) return [];

  const matches: { athlete: SimilarAthlete; score: number }[] = [];
  for (const a of known) {
    if (a.gender !== gender || normalizeWhitespace(a.name) === normalized) continue;
    const other = nameParts(a.name);
    const sameSurname = !!target.surname && target.surname === other.surname;
    const firstRelated =
      target.first === other.first ||
      target.first.startsWith(other.first) ||
      other.first.startsWith(target.first) ||
      levenshteinDistance(target.first, other.first) <= 1;
    const spelling = levenshteinDistance(target.all, other.all);
    const closeSpelling = spelling <= (Math.min(target.all.length, other.all.length) >= 8 ? 2 : 1);

    if (sameSurname && firstRelated) matches.push({ athlete: { ...a, reason: "Same surname, similar first name" }, score: 0 });
    else if (closeSpelling) matches.push({ athlete: { ...a, reason: "Similar spelling" }, score: 1 });
    else if (sameSurname) matches.push({ athlete: { ...a, reason: "Same surname" }, score: 2 });
  }
  return matches.sort((a, b) => a.score - b.score || a.athlete.name.localeCompare(b.athlete.name)).map((m) => m.athlete);
}

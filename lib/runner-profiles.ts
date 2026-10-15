import { prisma } from "./db";
import { categoryRank } from "./distances";
import { GENDER_LABEL, listLabelWithDistance, performanceText, type ListKey } from "./record-approval";
import { getCardsForAthlete } from "./record-highlights";
import { isJointPlace, performanceScore, placesOf } from "./record-ranking";
import type { RunnerSuggestion } from "./runner-search";
import { slugify } from "./slug";
import { normalizeWhitespace } from "./text";

// Runner profiles (/runner/<slug>) and the records page's "Find a runner"
// box. Read-only, and only from the public records: list entries, record
// history, and the public fields of approved submissions for share-card
// links — never emails, proof links, photos or undecided submissions.
//
// One runner is one name, matched the way the record lists match it (case
// and spacing ignored — see placeInList); different spellings are separate
// runners until merged with scripts/merge-athlete.ts.

type Unit = "time" | "laps";

export interface ProfilePlace {
  distanceName: string;
  /** "Women's", "Men's". */
  gender: string;
  /** "Overall" or the age group, e.g. "40-49". */
  list: string;
  place: number;
  joint: boolean;
  performance: string;
  unit: Unit;
  event: string | null;
  /** ISO string. */
  date: string | null;
  footnote: string | null;
  /** The share card for this place, if its approval has one. */
  cardUrl: string | null;
}

export interface ProfileHistoryEntry {
  distanceName: string;
  gender: string;
  list: string;
  performance: string;
  unit: Unit;
  event: string | null;
  date: string | null;
  /** Equalled the record rather than beating it, so it was shared. */
  equalled: boolean;
  /** Still the record (alone, or jointly). */
  current: boolean;
  joint: boolean;
}

export interface RunnerProfile {
  /** The spelling on the records (more than one only if two names share a slug). */
  names: string[];
  places: ProfilePlace[];
  history: ProfileHistoryEntry[];
}

const listOf = (recordType: string, ageCategory: string) => (recordType === "OVERALL" ? "Overall" : ageCategory);
const listKey = (r: { distanceId: string; gender: string; recordType: string; ageCategory: string }) =>
  [r.distanceId, r.gender, r.recordType, r.ageCategory].join("|");

async function loadRecords() {
  const [distances, entries, history] = await Promise.all([
    prisma.distance.findMany(),
    prisma.recordEntry.findMany({ where: { name: { not: null } }, include: { footnote: true }, orderBy: { rank: "asc" } }),
    prisma.recordHistoryEntry.findMany({ orderBy: { order: "asc" } }),
  ]);
  return { distanceById: new Map(distances.map((d) => [d.id, d])), entries, history };
}

/** Everyone on a record list or in a record history, for the search box. */
export async function getRunnerIndex(): Promise<RunnerSuggestion[]> {
  const { entries, history } = await loadRecords();
  const runners = new Map<string, { name: string; places: number; records: number }>();
  const runner = (name: string) => {
    const key = normalizeWhitespace(name);
    if (!runners.has(key)) runners.set(key, { name: name.trim().replace(/\s+/g, " "), places: 0, records: 0 });
    return runners.get(key)!;
  };
  for (const e of entries) runner(e.name!).places++;
  for (const h of history) runner(h.name).records++;

  return [...runners.values()]
    .map((r) => ({
      name: r.name,
      slug: slugify(r.name),
      summary:
        r.places > 0
          ? `${r.places} top-3 place${r.places === 1 ? "" : "s"}`
          : `Former record holder`,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The profile for /runner/<slug>, or null if no name on the records has that slug. */
export async function getRunnerProfile(slug: string): Promise<RunnerProfile | null> {
  const { distanceById, entries, history } = await loadRecords();

  const names = new Map<string, string>();
  for (const name of [...entries.map((e) => e.name!), ...history.map((h) => h.name)]) {
    if (slugify(name) === slug && !names.has(normalizeWhitespace(name))) {
      names.set(normalizeWhitespace(name), name.trim().replace(/\s+/g, " "));
    }
  }
  if (names.size === 0) return null;
  const isThem = (name: string | null) => !!name && names.has(normalizeWhitespace(name));

  const cards = await getCardsForAthlete([...names.values()]);
  const cardFor = (listLabel: string, performance: string) =>
    cards.find((c) => c.listLabel === listLabel && c.performance === performance);

  // Current places: each list they're on, with places worked out over the whole list.
  const lists = new Map<string, typeof entries>();
  for (const e of entries) lists.set(listKey(e), [...(lists.get(listKey(e)) ?? []), e]);
  const places: (ProfilePlace & { sort: [number, number, number] })[] = [];
  for (const list of lists.values()) {
    const distance = distanceById.get(list[0].distanceId)!;
    const unit = distance.unit as Unit;
    const listPlaces = placesOf(unit, list);
    list.forEach((e, i) => {
      if (!isThem(e.name)) return;
      const key: ListKey = {
        recordType: e.recordType as ListKey["recordType"],
        ageCategory: e.ageCategory,
        label: `${GENDER_LABEL[e.gender]} ${listOf(e.recordType, e.ageCategory)}`,
      };
      const performance = performanceText(unit, e);
      // The card's list label is written the same way ("Women's 40-49 5K").
      const card = cardFor(listLabelWithDistance(key, distance.name), performance);
      places.push({
        distanceName: distance.name,
        gender: GENDER_LABEL[e.gender] ?? e.gender,
        list: listOf(e.recordType, e.ageCategory),
        place: listPlaces[i],
        joint: isJointPlace(listPlaces, i),
        performance,
        unit,
        event: e.event,
        date: e.date?.toISOString() ?? null,
        footnote: e.footnote?.text ?? null,
        cardUrl: card ? `/record-card/${card.id}` : null,
        sort: [distance.sortOrder, e.recordType === "OVERALL" ? 0 : 1, categoryRank(e.ageCategory)],
      });
    });
  }
  places.sort((a, b) => a.sort[0] - b.sort[0] || a.sort[1] - b.sort[1] || a.sort[2] - b.sort[2]);

  // Their record history entries, with whether each equalled the record and
  // whether it's still current (the run of equal results at the end of the list).
  const historyLists = new Map<string, typeof history>();
  for (const h of history) historyLists.set(listKey(h), [...(historyLists.get(listKey(h)) ?? []), h]);
  const past: (ProfileHistoryEntry & { order: number; sortDate: number })[] = [];
  for (const list of historyLists.values()) {
    const distance = distanceById.get(list[0].distanceId)!;
    const unit = distance.unit as Unit;
    const score = (h: (typeof list)[number]) => performanceScore(unit, h);
    let currentFrom = list.length - 1;
    while (currentFrom > 0 && score(list[currentFrom - 1]) === score(list[list.length - 1])) currentFrom--;
    list.forEach((h, i) => {
      if (!isThem(h.name)) return;
      past.push({
        distanceName: distance.name,
        gender: GENDER_LABEL[h.gender] ?? h.gender,
        list: listOf(h.recordType, h.ageCategory),
        performance: performanceText(unit, h),
        unit,
        event: h.event,
        date: h.date?.toISOString() ?? null,
        equalled: i > 0 && score(h) === score(list[i - 1]),
        current: i >= currentFrom,
        joint: i >= currentFrom && list.length - currentFrom > 1,
        order: h.order,
        sortDate: h.date?.getTime() ?? 0,
      });
    });
  }
  // Newest first.
  past.sort((a, b) => b.sortDate - a.sortDate || b.order - a.order);

  return {
    names: [...names.values()],
    places: places.map(({ sort: _sort, ...p }) => p),
    history: past.map(({ order: _order, sortDate: _sortDate, ...h }) => h),
  };
}

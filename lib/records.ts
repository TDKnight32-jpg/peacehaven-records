import { prisma } from "./db";
import { isJointPlace, placesOf } from "./record-ranking";

export interface ClientRecord {
  id: string;
  distanceSlug: string;
  unit: "time" | "laps";
  gender: "M" | "F";
  recordType: "AGE_GROUP" | "OVERALL";
  ageCategory: string | null;
  /** Its slot in the list's stored order (1, 2, 3, and 4+ after a tie for 3rd). */
  rank: number;
  /** The place it holds, shared with exactly equal results: 1, 1, 3. */
  place: number;
  /** Whether it shares its place with another entry. */
  joint: boolean;
  name: string | null;
  time: string | null;
  laps: number | null;
  event: string | null;
  date: string | null;
  footnote: string | null;
  footnoteSymbol: string | null;
}

export interface DistanceMeta {
  slug: string;
  name: string;
  unit: "time" | "laps";
  sortOrder: number;
}

export interface ClientHistoryEntry {
  id: string;
  distanceSlug: string;
  gender: "M" | "F";
  recordType: "AGE_GROUP" | "OVERALL";
  ageCategory: string | null;
  order: number;
  name: string;
  time: string | null;
  laps: number | null;
  event: string | null;
  date: string | null;
}

export async function getRecordsData(): Promise<{
  distances: DistanceMeta[];
  records: ClientRecord[];
  history: ClientHistoryEntry[];
}> {
  const [distanceRows, recordRows, historyRows] = await Promise.all([
    prisma.distance.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.recordEntry.findMany({ include: { footnote: true } }),
    prisma.recordHistoryEntry.findMany({ orderBy: { order: "asc" } }),
  ]);

  const distanceById = new Map(distanceRows.map((d) => [d.id, d]));

  // Places are worked out per list, from the filled entries in stored order.
  const placeById = new Map<string, { place: number; joint: boolean }>();
  const lists = new Map<string, typeof recordRows>();
  for (const r of recordRows) {
    if (!r.name) continue;
    const key = [r.distanceId, r.gender, r.recordType, r.ageCategory].join("|");
    lists.set(key, [...(lists.get(key) ?? []), r]);
  }
  for (const list of lists.values()) {
    list.sort((a, b) => a.rank - b.rank);
    const places = placesOf(distanceById.get(list[0].distanceId)!.unit as "time" | "laps", list);
    list.forEach((r, i) => placeById.set(r.id, { place: places[i], joint: isJointPlace(places, i) }));
  }

  const records: ClientRecord[] = recordRows.map((r) => {
    const distance = distanceById.get(r.distanceId)!;
    return {
      id: r.id,
      distanceSlug: distance.slug,
      unit: distance.unit as "time" | "laps",
      gender: r.gender as "M" | "F",
      recordType: r.recordType as "AGE_GROUP" | "OVERALL",
      ageCategory: r.ageCategory || null,
      rank: r.rank,
      place: placeById.get(r.id)?.place ?? r.rank,
      joint: placeById.get(r.id)?.joint ?? false,
      name: r.name,
      time: r.time,
      laps: r.laps,
      event: r.event,
      date: r.date ? r.date.toISOString() : null,
      footnote: r.footnote?.text ?? null,
      footnoteSymbol: r.footnote?.symbol ?? null,
    };
  });

  const distances: DistanceMeta[] = distanceRows.map((d) => ({
    slug: d.slug,
    name: d.name,
    unit: d.unit as "time" | "laps",
    sortOrder: d.sortOrder,
  }));

  const history: ClientHistoryEntry[] = historyRows.map((h) => {
    const distance = distanceById.get(h.distanceId)!;
    return {
      id: h.id,
      distanceSlug: distance.slug,
      gender: h.gender as "M" | "F",
      recordType: h.recordType as "AGE_GROUP" | "OVERALL",
      ageCategory: h.ageCategory || null,
      order: h.order,
      name: h.name,
      time: h.time,
      laps: h.laps,
      event: h.event,
      date: h.date ? h.date.toISOString() : null,
    };
  });

  return { distances, records, history };
}

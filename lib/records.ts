import { prisma } from "./db";

export interface ClientRecord {
  id: string;
  distanceSlug: string;
  unit: "time" | "laps";
  gender: "M" | "F";
  recordType: "AGE_GROUP" | "OVERALL";
  ageCategory: string | null;
  rank: number;
  name: string | null;
  time: string | null;
  laps: number | null;
  event: string | null;
  date: string | null;
  footnote: string | null;
}

export interface DistanceMeta {
  slug: string;
  name: string;
  unit: "time" | "laps";
  sortOrder: number;
}

export async function getRecordsData(): Promise<{
  distances: DistanceMeta[];
  records: ClientRecord[];
}> {
  const [distanceRows, recordRows] = await Promise.all([
    prisma.distance.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.recordEntry.findMany({ include: { footnote: true } }),
  ]);

  const distanceById = new Map(distanceRows.map((d) => [d.id, d]));

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
      name: r.name,
      time: r.time,
      laps: r.laps,
      event: r.event,
      date: r.date ? r.date.toISOString() : null,
      footnote: r.footnote?.text ?? null,
    };
  });

  const distances: DistanceMeta[] = distanceRows.map((d) => ({
    slug: d.slug,
    name: d.name,
    unit: d.unit as "time" | "laps",
    sortOrder: d.sortOrder,
  }));

  return { distances, records };
}

import { prisma } from "./db";
import { categoryRank } from "./distances";

export interface SubmitDistanceOption {
  slug: string;
  name: string;
  unit: "time" | "laps";
  /** Age-group bands this distance uses on the records page, in display order. */
  ageCategories: string[];
}

// Used for a distance that has no age-group records yet (e.g. 1 Mile), so
// there's nothing on the records page to copy its bands from.
const DEFAULT_AGE_CATEGORIES = ["Under 40", "40-49", "50-59", "60-69", "70+"];

/** Every distance, with the age-group bands already used for it on the
 * records page — so a submitter picks from the same labels rather than
 * typing their own. Bands are pooled across both sexes: some distances only
 * have one sex's age-group records so far. */
export async function getSubmitDistanceOptions(): Promise<SubmitDistanceOption[]> {
  const [distances, bands] = await Promise.all([
    prisma.distance.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.recordEntry.findMany({
      where: { recordType: "AGE_GROUP", ageCategory: { not: "" } },
      select: { distanceId: true, ageCategory: true },
      distinct: ["distanceId", "ageCategory"],
    }),
  ]);

  return distances.map((d) => {
    const own = bands.filter((b) => b.distanceId === d.id).map((b) => b.ageCategory);
    return {
      slug: d.slug,
      name: d.name,
      unit: d.unit as "time" | "laps",
      ageCategories: own.length > 0 ? own.sort((a, b) => categoryRank(a) - categoryRank(b)) : DEFAULT_AGE_CATEGORIES,
    };
  });
}

/** "mm:ss" (under an hour) or "h:mm:ss". Returns the trimmed string, or null if invalid. */
export function parsePerformanceTime(raw: string): string | null {
  const t = raw.trim();
  if (/^[0-5]?\d:[0-5]\d$/.test(t) || /^\d{1,3}:[0-5]\d:[0-5]\d$/.test(t)) return t;
  return null;
}

export function isHttpUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

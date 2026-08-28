export type Unit = "time" | "laps";

export interface DistanceDef {
  slug: string;
  name: string;
  unit: Unit;
  sortOrder: number;
  /** Normalized (see normalizeLabel) forms of every literal label variant seen in the sheet. */
  matchKeys: string[];
}

/** Lowercase, strip punctuation/spaces, and fold "miles" -> "mile" so plural/singular
 * variants used inconsistently across sheet sections collapse to one key. */
export function normalizeLabel(s: string): string {
  return s
    .toLowerCase()
    .replace(/miles\b/g, "mile")
    .replace(/[^a-z0-9]/g, "");
}

function keys(...labels: string[]): string[] {
  return [...new Set(labels.map(normalizeLabel))];
}

export const DISTANCES: DistanceDef[] = [
  {
    slug: "1-mile",
    name: "1 Mile",
    unit: "time",
    sortOrder: 1,
    matchKeys: keys("1 mile (road)", "1 Mile"),
  },
  {
    slug: "5k",
    name: "5K",
    unit: "time",
    sortOrder: 2,
    matchKeys: keys("5KM", "5K"),
  },
  {
    slug: "10k",
    name: "10K",
    unit: "time",
    sortOrder: 3,
    matchKeys: keys("10KM", "10K"),
  },
  {
    slug: "10-mile",
    name: "10 Mile",
    unit: "time",
    sortOrder: 4,
    matchKeys: keys("10 Mile"),
  },
  {
    slug: "half-marathon",
    name: "Half Marathon",
    unit: "time",
    sortOrder: 5,
    matchKeys: keys("Half Marathon"),
  },
  {
    slug: "20-mile",
    name: "20 Mile",
    unit: "time",
    sortOrder: 6,
    matchKeys: keys("20 Mile"),
  },
  {
    slug: "marathon",
    name: "Marathon",
    unit: "time",
    sortOrder: 7,
    matchKeys: keys("Marathon"),
  },
  {
    slug: "50km",
    name: "50KM",
    unit: "time",
    sortOrder: 8,
    matchKeys: keys("50KM", "50 KM"),
  },
  {
    slug: "50-mile",
    name: "50 Mile",
    unit: "time",
    sortOrder: 9,
    matchKeys: keys("50 Mile", "50 Miles"),
  },
  {
    slug: "100km",
    name: "100KM",
    unit: "time",
    sortOrder: 10,
    matchKeys: keys("100KM", "100 KM"),
  },
  {
    slug: "100-mile",
    name: "100 Mile",
    unit: "time",
    sortOrder: 11,
    matchKeys: keys("100 Mile", "100 Miles"),
  },
  {
    slug: "back-yard-ultra",
    name: "Back Yard Ultra",
    unit: "laps",
    sortOrder: 12,
    matchKeys: keys("Back Yard Ultra", "Back Yard"),
  },
];

export function matchDistance(label: string): DistanceDef | undefined {
  const norm = normalizeLabel(label);
  if (!norm) return undefined;
  return DISTANCES.find((d) => d.matchKeys.includes(norm));
}

/** Normalizes the top age bracket, which the sheet spells inconsistently
 * ("70-Over" in women's columns, "Over 70" in men's) into one label.
 * All other category labels (which legitimately vary per distance section,
 * e.g. "Under 40" vs "20-39") are passed through as-is. */
export function normalizeCategory(raw: string): string {
  const t = raw.trim();
  if (/70/.test(t)) return "70+";
  return t;
}

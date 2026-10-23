import { parse } from "csv-parse/sync";
import { ageGrade } from "@/lib/age-grading";
import { FESTIVE_5K_SHEET_CSV } from "@/lib/festive5k-config";

// One finisher in one year's PRC Festive 5K, with everything the results
// board needs already worked out on the server.
export interface FestiveResult {
  year: number;
  name: string;
  gender: "M" | "F";
  age: number | null;
  secs: number;
  bib: string;
  guest: boolean;
  notes: string;
  pos: number; // overall, ties share a place
  genderPos: number;
  category: string | null; // e.g. "V40", needs age
  categoryPos: number | null;
  ageGrade: string | null; // e.g. "71.42", needs age
}

export interface FestiveData {
  results: FestiveResult[];
  years: number[]; // newest first
  error: string | null;
}

export function toSeconds(raw: string): number | null {
  const parts = raw.trim().split(":").map((p) => Number(p));
  if (parts.length < 2 || parts.length > 3 || parts.some((p) => !Number.isFinite(p))) return null;
  return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
}

// UK club-style age categories: U20, Senior (20-34), then 5-year veteran bands.
export function ageCategory(age: number | null): string | null {
  if (age == null) return null;
  if (age < 20) return "U20";
  if (age < 35) return "Senior";
  return `V${Math.floor(age / 5) * 5}`;
}

// Gives tied times the same place, like parkrun: 1, 2, 2, 4.
function rank<T extends { secs: number }>(list: T[], set: (r: T, n: number) => void) {
  let place = 0;
  list.forEach((r, i) => {
    if (i === 0 || list[i - 1].secs !== r.secs) place = i + 1;
    set(r, place);
  });
}

export function parseFestiveCsv(csv: string): FestiveResult[] {
  const rows: Record<string, string>[] = parse(csv, {
    columns: (h: string[]) => h.map((x) => x.trim().toLowerCase()),
    skip_empty_lines: true,
    relax_column_count: true,
  });
  const out: FestiveResult[] = [];
  for (const row of rows) {
    const year = Number((row["year"] ?? "").trim());
    const name = (row["name"] ?? "").trim().replace(/\s+/g, " ");
    const g = (row["gender"] ?? "").trim().toUpperCase();
    const secs = toSeconds(row["time"] ?? "");
    // Skip anything that isn't a finished result (blank rows, DNFs, typos).
    if (!year || !name || !secs || (g[0] !== "M" && g[0] !== "F")) continue;
    const ageNum = Number((row["age"] ?? "").trim());
    out.push({
      year,
      name,
      gender: g[0] as "M" | "F",
      age: (row["age"] ?? "").trim() && Number.isInteger(ageNum) ? ageNum : null,
      secs,
      bib: (row["bib no"] ?? row["bib"] ?? "").trim(),
      guest: (row["guest"] ?? "").trim().toUpperCase().startsWith("Y"),
      notes: (row["notes"] ?? "").trim(),
      pos: 0,
      genderPos: 0,
      category: null,
      categoryPos: null,
      ageGrade: null,
    });
  }

  const years = [...new Set(out.map((r) => r.year))];
  for (const y of years) {
    const yr = out.filter((r) => r.year === y).sort((a, b) => a.secs - b.secs);
    rank(yr, (r, n) => (r.pos = n));
    for (const g of ["M", "F"] as const) rank(yr.filter((r) => r.gender === g), (r, n) => (r.genderPos = n));
    for (const r of yr) {
      r.category = ageCategory(r.age);
      if (r.age != null) {
        const ag = ageGrade(r.gender === "M" ? "male" : "female", r.age, "5k", r.secs);
        r.ageGrade = ag.ok ? ag.percent : null;
      }
    }
    const cats = [...new Set(yr.map((r) => `${r.gender}|${r.category}`))];
    for (const c of cats) {
      if (c.endsWith("|null")) continue;
      rank(yr.filter((r) => `${r.gender}|${r.category}` === c), (r, n) => (r.categoryPos = n));
    }
  }
  return out.sort((a, b) => b.year - a.year || a.secs - b.secs);
}

export async function getFestiveData(): Promise<FestiveData> {
  if (!FESTIVE_5K_SHEET_CSV)
    return { results: [], years: [], error: "The results sheet link hasn't been added yet (lib/festive5k-config.ts)." };
  try {
    const res = await fetch(FESTIVE_5K_SHEET_CSV, { next: { revalidate: 60 } });
    if (!res.ok) throw new Error(`Sheet returned ${res.status}`);
    const results = parseFestiveCsv(await res.text());
    const years = [...new Set(results.map((r) => r.year))].sort((a, b) => b - a);
    return { results, years, error: null };
  } catch (e) {
    console.error("Festive 5K sheet fetch failed", e);
    return { results: [], years: [], error: "Couldn't load the results right now. Try again in a minute." };
  }
}

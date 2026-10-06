import { AGE_GRADING_2025, AGE_GRADING_MAX_AGE, AGE_GRADING_MIN_AGE } from "@/lib/age-grading-2025";
import { clock } from "@/lib/logbook-paces";

// Age grading with the 2025 road tables (lib/age-grading-2025.ts):
//   age-graded time       = your time x the factor for your age
//   age-graded percentage = the open-class standard / your age-graded time
// so 100% matches the best in the world for your age and gender.

export type Gender = "male" | "female";
export type AgeGradeDistance = keyof (typeof AGE_GRADING_2025)["male"];

// The road distances the tables cover that are also in the pace calculator,
// shortest to longest. Keys match lib/logbook-paces.ts's DISTANCES.
export const AGE_GRADE_DISTANCES: AgeGradeDistance[] = ["mile", "5k", "5mi", "10k", "10mi", "half", "mar"];

export const AGE_GRADE_BANDS = [
  { min: 100, label: "100%", meaning: "Roughly world record level" },
  { min: 90, label: "90%+", meaning: "World class" },
  { min: 80, label: "80%+", meaning: "National class" },
  { min: 70, label: "70%+", meaning: "Regional class" },
  { min: 60, label: "60%+", meaning: "Local class" },
] as const;

export type AgeGradeResult =
  | { ok: false; message: string }
  | {
      ok: true;
      percent: string;
      gradedTime: string;
      // The guide row this result falls in, or null below 60%.
      band: (typeof AGE_GRADE_BANDS)[number]["label"] | null;
    };

export function ageGrade(
  gender: Gender | null,
  age: number,
  key: AgeGradeDistance,
  totalSeconds: number,
): AgeGradeResult {
  if (!gender) return { ok: false, message: "Choose male or female to see your age grade." };
  if (!Number.isInteger(age) || age < AGE_GRADING_MIN_AGE || age > AGE_GRADING_MAX_AGE)
    return {
      ok: false,
      message: `Enter your age on race day, from ${AGE_GRADING_MIN_AGE} to ${AGE_GRADING_MAX_AGE}.`,
    };
  if (totalSeconds <= 0) return { ok: false, message: "Enter your time to see your age grade." };

  const { standard, factors } = AGE_GRADING_2025[gender][key];
  const graded = totalSeconds * factors[age - AGE_GRADING_MIN_AGE];
  const pct = (standard / graded) * 100;
  // A little over 100% can be a genuine age best; far over is a typo.
  if (pct > 105)
    return {
      ok: false,
      message: "That is quicker than the world record for your age. Check the hours, minutes and seconds.",
    };

  return {
    ok: true,
    percent: pct.toFixed(2),
    gradedTime: clock(graded),
    band: AGE_GRADE_BANDS.find((b) => pct >= b.min)?.label ?? null,
  };
}

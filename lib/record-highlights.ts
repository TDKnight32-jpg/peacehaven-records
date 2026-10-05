import { prisma } from "./db";
import { GENDER_LABEL, listsFor, performanceText, type ListKey } from "./record-approval";
import { RECORD_LIST_SIZE, formatRecordTime, performanceScore } from "./record-ranking";
import { normalizeWhitespace } from "./text";

export interface TimeToBeat {
  unit: "time" | "laps";
  /** Current #1, or null if the list is empty. */
  record: { name: string; performance: string } | null;
  /** The #3 performance a new entry has to beat (ties keep the existing
   * holder ahead — see placeInList), or null while the list has fewer than
   * 3 entries, so any performance gets on. */
  cutoff: string | null;
}

/** The current numbers for one age-group list, shown on the /submit form as
 * information only — nothing here blocks a slower submission. Returns null
 * for an unknown distance. */
export async function getTimeToBeat(
  distanceSlug: string,
  gender: "M" | "F",
  ageCategory: string,
): Promise<TimeToBeat | null> {
  const distance = await prisma.distance.findUnique({ where: { slug: distanceSlug } });
  if (!distance) return null;
  const unit = distance.unit as "time" | "laps";

  const list = await prisma.recordEntry.findMany({
    where: { distanceId: distance.id, gender, recordType: "AGE_GROUP", ageCategory, name: { not: null } },
    orderBy: { rank: "asc" },
  });
  const first = list[0];
  const last = list.length >= RECORD_LIST_SIZE ? list[RECORD_LIST_SIZE - 1] : null;
  return {
    unit,
    record: first ? { name: first.name!, performance: performanceText(unit, first) } : null,
    cutoff: last ? performanceText(unit, last) : null,
  };
}

export interface LatestRecord {
  id: string;
  /** e.g. "New Men's 10K record" or "New Women's 40-49 Marathon record". */
  headline: string;
  athleteName: string;
  performance: string;
  /** When the records officer approved it, ISO string. */
  decidedAt: string;
}

// How many recent approvals to look through for #1s. Most approvals are #2s
// and #3s, so this needs to be comfortably more than the 3 the strip shows.
const LATEST_RECORDS_SCAN = 50;

/**
 * The most recent approved submissions that took a #1 — overall or age
 * group — newest decision first, for the strip on the records page.
 *
 * Submissions don't store where they placed, but every approval that takes a
 * #1 appends that exact performance to the list's history (recordNewHolder
 * in lib/record-approval.ts), so a matching history row — same list, athlete
 * and performance — is the evidence. A submission that took both its age
 * group and the overall is one item, headlined as the overall record.
 */
export async function getLatestRecords(limit = 3): Promise<LatestRecord[]> {
  const approved = await prisma.recordSubmission.findMany({
    where: { status: "APPROVED", decidedAt: { not: null } },
    orderBy: { decidedAt: "desc" },
    take: LATEST_RECORDS_SCAN,
    include: { distance: true },
  });
  if (approved.length === 0) return [];

  const history = await prisma.recordHistoryEntry.findMany({
    where: { distanceId: { in: [...new Set(approved.map((s) => s.distanceId))] } },
  });

  const latest: LatestRecord[] = [];
  for (const s of approved) {
    const unit = s.distance.unit as "time" | "laps";
    const score = performanceScore(unit, s);
    const name = normalizeWhitespace(s.athleteName);
    const took = (key: ListKey) =>
      history.some(
        (h) =>
          h.distanceId === s.distanceId &&
          h.gender === s.gender &&
          h.recordType === key.recordType &&
          h.ageCategory === key.ageCategory &&
          normalizeWhitespace(h.name) === name &&
          performanceScore(unit, h) === score,
      );

    const [ageGroup, overall] = listsFor(s);
    const list = took(overall) ? overall : took(ageGroup) ? ageGroup : null;
    if (!list) continue;

    const gender = GENDER_LABEL[s.gender] ?? s.gender;
    const scope = list.recordType === "OVERALL" ? gender : `${gender} ${s.ageCategory}`;
    latest.push({
      id: s.id,
      headline: `New ${scope} ${s.distance.name} record`,
      athleteName: s.athleteName,
      // As typed on the form ("35:34"); shown like the records page ("00:35:34").
      performance: unit === "laps" ? performanceText(unit, s) : formatRecordTime(score),
      decidedAt: s.decidedAt!.toISOString(),
    });
    if (latest.length === limit) break;
  }
  return latest;
}

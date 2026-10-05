import type { Prisma, RecordHistoryEntry } from "@prisma/client";
import { prisma } from "./db";
import { listLabelWithDistance, listsFor, performanceText, type ListKey } from "./record-approval";
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

/** The fields of an approved submission that are safe to show publicly —
 * deliberately not the submitter's email, proof link or photo. */
const PUBLIC_SUBMISSION_FIELDS = {
  id: true,
  distanceId: true,
  gender: true,
  ageCategory: true,
  athleteName: true,
  time: true,
  laps: true,
  date: true,
  decidedAt: true,
  distance: { select: { name: true, unit: true } },
} as const;

type PublicSubmission = Prisma.RecordSubmissionGetPayload<{ select: typeof PUBLIC_SUBMISSION_FIELDS }>;

export interface NewRecord {
  id: string;
  /** The list it took #1 in, e.g. "Men's 10K" or "Women's 40-49 Half Marathon". */
  listLabel: string;
  athleteName: string;
  unit: "time" | "laps";
  /** "00:35:34", or "31 laps" for Back Yard Ultra. */
  performance: string;
  /** Race date, ISO string. */
  raceDate: string;
  /** When the records officer approved it, ISO string. */
  decidedAt: string;
}

/**
 * The record an approved submission set, or null if it didn't take a #1.
 *
 * Submissions don't store where they placed, but every approval that takes a
 * #1 appends that exact performance to the list's history (recordNewHolder
 * in lib/record-approval.ts), so a matching history row — same list, athlete
 * and performance — is the evidence. A submission that took both its age
 * group and the overall counts once, as the overall record.
 */
function newRecordFrom(s: PublicSubmission, history: RecordHistoryEntry[]): NewRecord | null {
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
  if (!list) return null;

  return {
    id: s.id,
    listLabel: listLabelWithDistance(list, s.distance.name),
    athleteName: s.athleteName,
    unit,
    // As typed on the form ("35:34"); shown like the records page ("00:35:34").
    performance: unit === "laps" ? performanceText(unit, s) : formatRecordTime(score),
    raceDate: s.date.toISOString(),
    decidedAt: s.decidedAt!.toISOString(),
  };
}

// How many recent approvals to look through for #1s. Most approvals are #2s
// and #3s, so this needs to be comfortably more than the 3 the strip shows.
const LATEST_RECORDS_SCAN = 50;

/** The most recent approved submissions that took a #1 — overall or age
 * group — newest decision first, for the strip on the records page. */
export async function getLatestRecords(limit = 3): Promise<NewRecord[]> {
  const approved = await prisma.recordSubmission.findMany({
    where: { status: "APPROVED", decidedAt: { not: null } },
    orderBy: { decidedAt: "desc" },
    take: LATEST_RECORDS_SCAN,
    select: PUBLIC_SUBMISSION_FIELDS,
  });
  if (approved.length === 0) return [];

  const history = await prisma.recordHistoryEntry.findMany({
    where: { distanceId: { in: [...new Set(approved.map((s) => s.distanceId))] } },
  });

  const latest: NewRecord[] = [];
  for (const s of approved) {
    const record = newRecordFrom(s, history);
    if (record) latest.push(record);
    if (latest.length === limit) break;
  }
  return latest;
}

/** One approved submission's record, for its share card — or null unless it
 * was approved and took a #1 (exactly the ones getLatestRecords can show). */
export async function getNewRecord(id: string): Promise<NewRecord | null> {
  const s = await prisma.recordSubmission.findFirst({
    where: { id, status: "APPROVED", decidedAt: { not: null } },
    select: PUBLIC_SUBMISSION_FIELDS,
  });
  if (!s) return null;
  const history = await prisma.recordHistoryEntry.findMany({
    where: { distanceId: s.distanceId, gender: s.gender },
  });
  return newRecordFrom(s, history);
}

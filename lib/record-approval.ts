import type { Distance, Prisma, RecordEntry, RecordSubmission } from "@prisma/client";
import { prisma } from "./db";
import {
  RECORD_LIST_SIZE,
  formatRecordTime,
  performanceScore,
  placeInList,
  timeToSeconds,
  type Placement,
} from "./record-ranking";
import { normalizeWhitespace } from "./text";

type Db = typeof prisma | Prisma.TransactionClient;
type SubmissionWithDistance = RecordSubmission & { distance: Distance };

export const GENDER_LABEL: Record<string, string> = { F: "Women's", M: "Men's" };

export interface ListKey {
  recordType: "AGE_GROUP" | "OVERALL";
  ageCategory: string; // "" for OVERALL, as stored on RecordEntry
  label: string;
}

/** The two lists a submission competes in: its age group and the overall. */
export function listsFor(s: Pick<RecordSubmission, "gender" | "ageCategory">): ListKey[] {
  const gender = GENDER_LABEL[s.gender] ?? s.gender;
  return [
    { recordType: "AGE_GROUP", ageCategory: s.ageCategory, label: `${gender} ${s.ageCategory}` },
    { recordType: "OVERALL", ageCategory: "", label: `${gender} Overall` },
  ];
}

/** Filled entries of one record list, in rank order. */
async function currentList(db: Db, s: RecordSubmission, key: ListKey): Promise<RecordEntry[]> {
  return db.recordEntry.findMany({
    where: {
      distanceId: s.distanceId,
      gender: s.gender,
      recordType: key.recordType,
      ageCategory: key.ageCategory,
      name: { not: null },
    },
    orderBy: { rank: "asc" },
  });
}

function placement(s: SubmissionWithDistance, list: RecordEntry[]): Placement<RecordEntry> {
  const unit = s.distance.unit as "time" | "laps";
  return placeInList(unit, list, { name: s.athleteName, time: s.time, laps: s.laps });
}

export interface PlacementSummary {
  label: string;
  /** e.g. "Would rank #2 in Women's 40-49". */
  text: string;
  /** Whether approving would change this list. */
  entersList: boolean;
}

export function performanceText(unit: string, e: { time: string | null; laps: number | null }): string {
  return unit === "laps" ? `${e.laps} laps` : (e.time ?? "—");
}

/** Where each pending submission would land against the current live
 * records, if approved — for the officials' queue. */
export async function describePlacements(submission: SubmissionWithDistance): Promise<PlacementSummary[]> {
  const unit = submission.distance.unit;
  return Promise.all(
    listsFor(submission).map(async (key) => {
      const p = placement(submission, await currentList(prisma, submission, key));
      const isOverall = key.recordType === "OVERALL";
      let text: string;
      if (p.kind === "enters") {
        text =
          p.position === 1
            ? isOverall
              ? `Would become the club's ${key.label} best`
              : `Would become the ${key.label} record`
            : `Would rank #${p.position} in ${key.label}`;
      } else if (p.kind === "outside") {
        text = `Outside the top ${RECORD_LIST_SIZE} in ${key.label} (#${RECORD_LIST_SIZE} is ${performanceText(unit, p.cutoff)})`;
      } else {
        text = `Already #${p.existingRank} in ${key.label} with ${performanceText(unit, p.existing)} — no change`;
      }
      return { label: key.label, text, entersList: p.kind === "enters" };
    }),
  );
}

/**
 * Publishes an approved submission into the live records, inside the
 * approval transaction (see decideSubmission): re-ranks its age-group and
 * overall lists — shifting existing holders down, dropping whoever falls off
 * the top 3, and replacing the athlete's own older entry — and, for each list
 * where it takes #1, appends to that list's history (see recordNewHolder).
 * Footnotes stay with the performance they annotate. Returns a summary of
 * what changed.
 */
export async function publishApprovedSubmission(
  tx: Prisma.TransactionClient,
  submission: SubmissionWithDistance,
): Promise<string[]> {
  const seconds = submission.time ? timeToSeconds(submission.time) : null;
  const newEntry = {
    name: submission.athleteName,
    time: seconds != null ? formatRecordTime(seconds) : null,
    laps: submission.laps,
    event: submission.event,
    date: submission.date,
    footnoteId: null,
  };

  const changes: string[] = [];
  for (const key of listsFor(submission)) {
    const current = await currentList(tx, submission, key);
    const p = placement(submission, current);
    if (p.kind !== "enters") continue;

    for (const [i, entry] of p.list.entries()) {
      const data =
        entry === "NEW"
          ? newEntry
          : {
              name: entry.name,
              time: entry.time,
              laps: entry.laps,
              event: entry.event,
              date: entry.date,
              footnoteId: entry.footnoteId,
            };
      const slot = {
        distanceId: submission.distanceId,
        gender: submission.gender,
        recordType: key.recordType,
        ageCategory: key.ageCategory,
        rank: i + 1,
      };
      await tx.recordEntry.upsert({
        where: { distanceId_gender_recordType_ageCategory_rank: slot },
        update: data,
        create: { ...slot, ...data },
      });
    }
    changes.push(`#${p.position} in ${key.label}`);

    if (p.position === 1) await recordNewHolder(tx, submission, key, current[0], newEntry);
  }
  return changes;
}

type HistoryPerformance = { name: string | null; time: string | null; laps: number | null };
type HistoryHolder = HistoryPerformance & { event: string | null; date: Date | null };

function samePerformance(unit: "time" | "laps", a: HistoryPerformance, b: HistoryPerformance): boolean {
  return (
    !!a.name &&
    !!b.name &&
    normalizeWhitespace(a.name) === normalizeWhitespace(b.name) &&
    performanceScore(unit, a) === performanceScore(unit, b)
  );
}

/**
 * Appends a new #1 to its list's history (overall or one age group, at any
 * distance). The holder it displaces is saved first unless they're already
 * the latest history entry (same name and performance) — so a former record
 * is never lost, including when someone beats their own record, and a list
 * with no history yet starts one with both holders. Only #1 is a record:
 * entering at #2 or #3 never reaches here.
 */
async function recordNewHolder(
  tx: Prisma.TransactionClient,
  submission: SubmissionWithDistance,
  key: ListKey,
  displaced: RecordEntry | undefined,
  newHolder: HistoryHolder,
) {
  const unit = submission.distance.unit as "time" | "laps";
  const list = {
    distanceId: submission.distanceId,
    gender: submission.gender,
    recordType: key.recordType,
    ageCategory: key.ageCategory,
  };
  const latest = await tx.recordHistoryEntry.findFirst({ where: list, orderBy: { order: "desc" } });
  let order = latest?.order ?? 0;

  const holders: HistoryHolder[] = [];
  if (displaced?.name && !(latest && samePerformance(unit, latest, displaced))) holders.push(displaced);
  holders.push(newHolder);

  for (const h of holders) {
    order++;
    await tx.recordHistoryEntry.create({
      data: { ...list, order, name: h.name!, time: h.time, laps: h.laps, event: h.event, date: h.date },
    });
  }
}

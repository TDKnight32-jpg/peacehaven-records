import type { Distance, Prisma, RecordEntry, RecordSubmission } from "@prisma/client";
import { prisma } from "./db";
import { HISTORY_DISTANCE_SLUGS } from "./csv-parser";
import { RECORD_LIST_SIZE, formatRecordTime, placeInList, timeToSeconds, type Placement } from "./record-ranking";

type Db = typeof prisma | Prisma.TransactionClient;
type SubmissionWithDistance = RecordSubmission & { distance: Distance };

const GENDER_LABEL: Record<string, string> = { F: "Women's", M: "Men's" };

interface ListKey {
  recordType: "AGE_GROUP" | "OVERALL";
  ageCategory: string; // "" for OVERALL, as stored on RecordEntry
  label: string;
}

/** The two lists a submission competes in: its age group and the overall. */
function listsFor(s: RecordSubmission): ListKey[] {
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

function performanceText(unit: string, e: { time: string | null; laps: number | null }): string {
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
 * the top 3, and replacing the athlete's own older entry — and, for a new
 * overall #1 at a distance with a records history, appends to that history.
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
    const p = placement(submission, await currentList(tx, submission, key));
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

    const tracksHistory = (HISTORY_DISTANCE_SLUGS as readonly string[]).includes(submission.distance.slug);
    if (key.recordType === "OVERALL" && p.position === 1 && tracksHistory && newEntry.time) {
      const last = await tx.recordHistoryEntry.findFirst({
        where: { distanceId: submission.distanceId, gender: submission.gender },
        orderBy: { order: "desc" },
      });
      await tx.recordHistoryEntry.create({
        data: {
          distanceId: submission.distanceId,
          gender: submission.gender,
          order: (last?.order ?? 0) + 1,
          name: newEntry.name,
          time: newEntry.time,
          event: newEntry.event,
          date: newEntry.date,
        },
      });
    }
  }
  return changes;
}

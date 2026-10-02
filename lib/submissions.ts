import { del } from "@vercel/blob";
import { Prisma, type Distance, type RecordSubmission } from "@prisma/client";
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

/** Records the records officer's decision on a pending submission, and
 * deletes its results photo (if any) from Blob storage — the photo is only
 * kept until a decision is made.
 *
 * `onDecide` runs inside the same transaction as the status change (approval
 * uses it to publish the record), so either both happen or neither does.
 * Returns `{ result }` with whatever `onDecide` returned, or null if the
 * submission doesn't exist or was already decided.
 *
 * The row is updated first, so a failed photo delete can only leave an
 * orphaned photo (logged with its URL for manual cleanup), never a pending
 * submission whose photo has vanished. */
export async function decideSubmission<T = void>(
  id: string,
  decision: "APPROVED" | "DECLINED",
  options: {
    declineReason?: string;
    onDecide?: (tx: Prisma.TransactionClient, submission: RecordSubmission & { distance: Distance }) => Promise<T>;
  } = {},
): Promise<{ result: T | undefined } | null> {
  const outcome = await prisma.$transaction(
    async (tx) => {
      const submission = await tx.recordSubmission.findUnique({ where: { id }, include: { distance: true } });
      if (!submission) return null;

      // Conditional on still being PENDING, so two officials acting at once
      // can't both decide it.
      const { count } = await tx.recordSubmission.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: decision,
          photoUrl: null,
          decidedAt: new Date(),
          declineReason: decision === "DECLINED" ? options.declineReason ?? null : null,
        },
      });
      if (count === 0) return null;

      const result = await options.onDecide?.(tx, submission);
      return { photoUrl: submission.photoUrl, result };
    },
    // Serializable so two approvals landing in the same record list at once
    // can't both re-rank it from the same starting point.
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  if (!outcome) return null;

  if (outcome.photoUrl) {
    await del(outcome.photoUrl).catch((err) => {
      console.error(`Couldn't delete photo for decided submission ${id}: ${outcome.photoUrl}`, err);
    });
  }
  return { result: outcome.result };
}

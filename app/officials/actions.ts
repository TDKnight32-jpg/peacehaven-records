"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isOfficial, isOfficialsAreaConfigured, logInOfficial, logOutOfficial } from "@/lib/officials-auth";
import type { Distance, RecordSubmission } from "@prisma/client";
import { approvalMessage, declineMessage, describeChanges } from "@/lib/decision-messages";
import { publishApprovedSubmission } from "@/lib/record-approval";
import { getNewRecord, type NewRecord } from "@/lib/record-highlights";
import { formatRecordTime, timeToSeconds } from "@/lib/record-ranking";
import { decideSubmission } from "@/lib/submissions";

export type LoginState = { error: string | null };

export async function logIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isOfficialsAreaConfigured()) {
    return { error: "The officials area isn't set up yet — OFFICIALS_PASSWORD is missing." };
  }
  const attempt = formData.get("password");
  if (typeof attempt !== "string" || !(await logInOfficial(attempt))) {
    // One shared password on a public page: slow down guessing.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return { error: "That password isn't right." };
  }
  redirect("/officials");
}

export async function logOut(): Promise<void> {
  await logOutOfficial();
  redirect("/officials/login");
}

/** What the officer's confirmation panel shows after a decision. Only ever
 * returned to a logged-in official — it includes the submitter's email. */
export type DecisionOutcome = {
  id: string;
  athleteName: string;
  distanceName: string;
  performance: string;
  email: string;
  /** Ready-made text for the officer to copy and send — never sent automatically. */
  message: string;
} & (
  | {
      decision: "APPROVED";
      /** In plain words, e.g. "Now #1 in Men's 10K". */
      changes: string[];
      /** Set if it became a #1 — the same check as the Latest records strip and card route. */
      newRecord: NewRecord | null;
    }
  | { decision: "DECLINED"; reason: string }
);

export type DecisionResult = { ok: true; outcome: DecisionOutcome } | { ok: false; error: string };

/** "35:34" as typed → "00:35:34" as on the records page; laps as "31 laps". */
function performanceOf(s: RecordSubmission & { distance: Distance }): string {
  if (s.distance.unit === "laps") return `${s.laps} laps`;
  const seconds = s.time ? timeToSeconds(s.time) : null;
  return seconds != null ? formatRecordTime(seconds) : (s.time ?? "");
}

const ALREADY_DECIDED = "This submission has already been approved or declined — refresh to see the current queue.";
const MAX_REASON = 500;

export async function approveSubmission(id: string): Promise<DecisionResult> {
  if (!(await isOfficial())) return { ok: false, error: "Your session has expired — please log in again." };

  const outcome = await decideSubmission(id, "APPROVED", {
    onDecide: async (tx, submission) => ({ submission, changes: await publishApprovedSubmission(tx, submission) }),
  });
  if (!outcome?.result) return { ok: false, error: ALREADY_DECIDED };

  revalidatePath("/officials");
  revalidatePath("/");
  const { submission, changes } = outcome.result;
  // Read after the approval has committed, so it sees the new history entry.
  const newRecord = await getNewRecord(id);
  const performance = performanceOf(submission);
  return {
    ok: true,
    outcome: {
      decision: "APPROVED",
      id,
      athleteName: submission.athleteName,
      distanceName: submission.distance.name,
      performance,
      email: submission.email,
      changes: describeChanges(changes),
      newRecord,
      message: approvalMessage({
        athleteName: submission.athleteName,
        distanceName: submission.distance.name,
        performance,
        changes,
        newRecordList: newRecord?.listLabel ?? null,
      }),
    },
  };
}

export async function declineSubmission(id: string, reason: string): Promise<DecisionResult> {
  if (!(await isOfficial())) return { ok: false, error: "Your session has expired — please log in again." };

  const note = reason.trim();
  if (!note) return { ok: false, error: "Add a short reason for declining." };
  if (note.length > MAX_REASON) return { ok: false, error: `Keep the reason under ${MAX_REASON} characters.` };

  const outcome = await decideSubmission(id, "DECLINED", {
    declineReason: note,
    onDecide: async (_tx, submission) => submission,
  });
  if (!outcome?.result) return { ok: false, error: ALREADY_DECIDED };

  revalidatePath("/officials");
  const submission = outcome.result;
  const performance = performanceOf(submission);
  return {
    ok: true,
    outcome: {
      decision: "DECLINED",
      id,
      athleteName: submission.athleteName,
      distanceName: submission.distance.name,
      performance,
      email: submission.email,
      reason: note,
      message: declineMessage({
        athleteName: submission.athleteName,
        distanceName: submission.distance.name,
        performance,
        reason: note,
      }),
    },
  };
}

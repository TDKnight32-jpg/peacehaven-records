"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isOfficial, isOfficialsAreaConfigured, logInOfficial, logOutOfficial } from "@/lib/officials-auth";
import { publishApprovedSubmission } from "@/lib/record-approval";
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

export type DecisionResult = { ok: true; message: string } | { ok: false; error: string };

const ALREADY_DECIDED = "This submission has already been approved or declined — refresh to see the current queue.";
const MAX_REASON = 500;

export async function approveSubmission(id: string): Promise<DecisionResult> {
  if (!(await isOfficial())) return { ok: false, error: "Your session has expired — please log in again." };

  const outcome = await decideSubmission(id, "APPROVED", {
    onDecide: async (tx, submission) => ({
      athlete: submission.athleteName,
      distance: submission.distance.name,
      changes: await publishApprovedSubmission(tx, submission),
    }),
  });
  if (!outcome?.result) return { ok: false, error: ALREADY_DECIDED };

  revalidatePath("/officials");
  revalidatePath("/");
  const { athlete, distance, changes } = outcome.result;
  return {
    ok: true,
    message:
      changes.length > 0
        ? `Approved ${athlete}'s ${distance} — now ${changes.join(" and ")} on the live records.`
        : `Approved ${athlete}'s ${distance}. It didn't make a top 3, so the live records are unchanged.`,
  };
}

export async function declineSubmission(id: string, reason: string): Promise<DecisionResult> {
  if (!(await isOfficial())) return { ok: false, error: "Your session has expired — please log in again." };

  const note = reason.trim();
  if (!note) return { ok: false, error: "Add a short reason for declining." };
  if (note.length > MAX_REASON) return { ok: false, error: `Keep the reason under ${MAX_REASON} characters.` };

  const outcome = await decideSubmission(id, "DECLINED", { declineReason: note });
  if (!outcome) return { ok: false, error: ALREADY_DECIDED };

  revalidatePath("/officials");
  return { ok: true, message: "Submission declined. The reason has been saved with it." };
}

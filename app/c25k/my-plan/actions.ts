"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSessionRunner, logout as clearSession } from "@/lib/c25k-auth";
import { redirect } from "next/navigation";

export async function toggleSessionComplete(cohortId: string, sessionId: string, completed: boolean) {
  const runner = await getSessionRunner();
  if (!runner) return;

  // Ownership is derived from the session, not taken from the client — the
  // client only tells us which session and which desired state.
  if (completed) {
    await prisma.runnerProgress.upsert({
      where: { runnerId_cohortId_sessionId: { runnerId: runner.id, cohortId, sessionId } },
      update: {},
      create: { runnerId: runner.id, cohortId, sessionId },
    });
  } else {
    await prisma.runnerProgress.deleteMany({
      where: { runnerId: runner.id, cohortId, sessionId },
    });
  }

  revalidatePath("/c25k/my-plan");
}

export async function logout() {
  await clearSession();
  redirect("/c25k");
}

"use server";

import { revalidatePath } from "next/cache";
import type { SessionStatus, SessionType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionRunner, logout as clearSession } from "@/lib/c25k-auth";
import { evaluateAndAwardBadges } from "@/lib/c25k-badges";
import { redirect } from "next/navigation";

/** Resolves a session as Completed or Missed — or, if it's already
 * resolved, switches it between the two. (A full revert back to
 * unresolved is a separate action, `revertSession` below, and only
 * possible for the single most-recently-resolved session.)
 *
 * Sessions must resolve in strict plan order, enforced here server-side,
 * not just by the UI hiding the buttons: resolving a session for the
 * first time is rejected unless every session before it (across all 9
 * weeks) is already resolved. Switching an *already*-resolved session's
 * status skips that check — it's not a new resolution, just a correction. */
export async function setSessionStatus(cohortId: string, sessionId: string, status: SessionStatus) {
  const runner = await getSessionRunner();
  if (!runner) return;

  const [allSessions, progress] = await Promise.all([
    prisma.c25kSession.findMany({
      orderBy: [{ week: { weekNumber: "asc" } }, { order: "asc" }],
    }),
    prisma.runnerProgress.findMany({ where: { runnerId: runner.id, cohortId } }),
  ]);

  const resolvedSessionIds = new Set(progress.map((p) => p.sessionId));
  const alreadyResolved = resolvedSessionIds.has(sessionId);

  if (!alreadyResolved) {
    const targetIndex = allSessions.findIndex((s) => s.id === sessionId);
    const priorSessionsAllResolved = allSessions
      .slice(0, targetIndex)
      .every((s) => resolvedSessionIds.has(s.id));
    if (targetIndex === -1 || !priorSessionsAllResolved) return; // out of order — silently reject
  }

  await prisma.runnerProgress.upsert({
    where: { runnerId_cohortId_sessionId: { runnerId: runner.id, cohortId, sessionId } },
    update: {
      status,
      completedAt: new Date(),
      // A session just switched to Missed has nothing to log.
      ...(status === "MISSED" ? { durationMinutes: null, sessionType: null, timeOfDay: null } : {}),
    },
    create: { runnerId: runner.id, cohortId, sessionId, status },
  });

  const newlyEarnedBadges = await evaluateAndAwardBadges(runner.id, cohortId);
  revalidatePath("/c25k/my-plan");
  return { newlyEarnedBadges };
}

/** Undoes the single most-recently-resolved session back to unresolved —
 * rejected (silently, same as setSessionStatus's order check) for anything
 * else, since once a later session has resolved, going back would leave
 * that later one's resolution hanging ahead of a gap. No badge
 * re-evaluation needed: badges are never revoked, and removing data can't
 * newly qualify one. */
export async function revertSession(cohortId: string, sessionId: string) {
  const runner = await getSessionRunner();
  if (!runner) return;

  const [allSessions, progress] = await Promise.all([
    prisma.c25kSession.findMany({
      orderBy: [{ week: { weekNumber: "asc" } }, { order: "asc" }],
    }),
    prisma.runnerProgress.findMany({ where: { runnerId: runner.id, cohortId } }),
  ]);

  const resolvedSessionIds = new Set(progress.map((p) => p.sessionId));
  const lastResolvedSession = [...allSessions].reverse().find((s) => resolvedSessionIds.has(s.id));
  if (!lastResolvedSession || lastResolvedSession.id !== sessionId) return; // not the most recent — reject

  await prisma.runnerProgress.delete({
    where: { runnerId_cohortId_sessionId: { runnerId: runner.id, cohortId, sessionId } },
  });

  revalidatePath("/c25k/my-plan");
}

/** Optional, quick-logged detail for an already-completed session — never a
 * blocker to just ticking the box. Each field is saved independently as the
 * runner fills it in; leaving them all blank is a fully valid final state. */
export async function logSessionDetails(
  cohortId: string,
  sessionId: string,
  details: {
    durationMinutes?: number | null;
    sessionType?: "SOLO" | "GROUP" | null;
    timeOfDay?: string | null;
    mood?: number | null;
  },
) {
  const runner = await getSessionRunner();
  if (!runner) return;

  await prisma.runnerProgress.upsert({
    where: { runnerId_cohortId_sessionId: { runnerId: runner.id, cohortId, sessionId } },
    update: { ...details, sessionType: details.sessionType as SessionType | null | undefined },
    create: {
      runnerId: runner.id,
      cohortId,
      sessionId,
      status: "COMPLETED",
      ...details,
      sessionType: details.sessionType as SessionType | null | undefined,
    },
  });

  await evaluateAndAwardBadges(runner.id, cohortId);
  revalidatePath("/c25k/my-plan");
}

export async function logout() {
  await clearSession();
  redirect("/c25k");
}

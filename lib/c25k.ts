import { prisma } from "./db";
import { BADGE_DEFINITIONS } from "./c25k-badges";

/** Sessions resolve in strict order across the whole 9-week plan (see
 * getPlanWithProgress) — at most one session is ever "current" (the next
 * unresolved one); everything before it is "completed" or "missed",
 * everything after is "locked". */
export type SessionLockStatus = "completed" | "missed" | "current" | "locked";

export interface ClientC25kSession {
  id: string;
  dayLabel: string;
  description: string | null;
  order: number;
  status: SessionLockStatus;
  // True only for the single most-recently-resolved session across the
  // whole plan — the one immediately before "current" — meaning it can be
  // reverted back to unresolved (see actions.ts#revertSession). Once a
  // later session resolves, this goes false and only swapping
  // Completed/Missed remains possible. Always false for "current"/"locked".
  canRevert: boolean;
  // Optional, quick-logged detail (see app/c25k/my-plan/actions.ts#logSessionDetails)
  // — null until the runner fills them in, which they never have to. Always
  // null on a "missed" session — there's nothing to log.
  durationMinutes: number | null;
  sessionType: "SOLO" | "GROUP" | null;
  timeOfDay: string | null;
  mood: number | null;
}

/** "current" is the week holding the next unresolved session. Every week
 * before it is "complete" (every session resolved, one way or another —
 * `hasMissedSession` says whether that includes a miss); every week after
 * is "upcoming" (locked). If every session is resolved, every week is
 * "complete" and none is "current". */
export type WeekStatus = "complete" | "current" | "upcoming";

export interface ClientC25kWeek {
  id: string;
  weekNumber: number;
  title: string;
  description: string | null;
  status: WeekStatus;
  // True if `status` is "complete" but at least one of its sessions was
  // missed rather than completed — drives the amber "Done — missed" chip
  // instead of the green "Complete" one, and this week's badge is never
  // awarded (see c25k-badges.ts's WEEKLY_COMPLETE, which only counts
  // COMPLETED progress rows).
  hasMissedSession: boolean;
  sessions: ClientC25kSession[];
}

export interface ClientCohort {
  id: string;
  year: number;
  name: string;
  startDate: string;
}

/**
 * The cohort a runner should see by default: the most recent one that's
 * already started, or (if the next intake hasn't started yet) the soonest
 * upcoming one. Returns null if no cohorts exist yet.
 */
export async function getCurrentCohort(): Promise<ClientCohort | null> {
  const now = new Date();

  const started = await prisma.cohort.findFirst({
    where: { startDate: { lte: now } },
    orderBy: { startDate: "desc" },
  });
  if (started) {
    return { id: started.id, year: started.year, name: started.name, startDate: started.startDate.toISOString() };
  }

  const upcoming = await prisma.cohort.findFirst({
    where: { startDate: { gt: now } },
    orderBy: { startDate: "asc" },
  });
  if (!upcoming) return null;
  return { id: upcoming.id, year: upcoming.year, name: upcoming.name, startDate: upcoming.startDate.toISOString() };
}

/** The full 9-week plan, with per-session lock status (and any logged
 * duration/type/time) for the given runner+cohort. Locking isn't stored —
 * it's computed here from one flat, cross-week sequence of all 27
 * sessions in plan order: the first one without a RunnerProgress row is
 * "current" (the only actionable one), everything before it is resolved,
 * everything after is "locked". Because resolution only ever moves
 * forward (see actions.ts), a week's own sessions always read as some
 * resolved prefix, then at most one "current", then a locked suffix —
 * never resolved-after-locked — so each week's status falls out of its
 * sessions' statuses directly, below. */
export async function getPlanWithProgress(runnerId: string, cohortId: string): Promise<ClientC25kWeek[]> {
  const [weeks, progress] = await Promise.all([
    prisma.c25kWeek.findMany({
      orderBy: { weekNumber: "asc" },
      include: { sessions: { orderBy: { order: "asc" } } },
    }),
    prisma.runnerProgress.findMany({ where: { runnerId, cohortId } }),
  ]);

  const progressBySessionId = new Map(progress.map((p) => [p.sessionId, p]));

  const flatSessions = weeks.flatMap((week) => week.sessions);
  const currentFlatIndex = flatSessions.findIndex((s) => !progressBySessionId.has(s.id));
  // The one session eligible for a full revert: the most recently resolved
  // one. -1 (no session has ever been resolved) means none is.
  const lastResolvedFlatIndex = currentFlatIndex === -1 ? flatSessions.length - 1 : currentFlatIndex - 1;

  let flatIndex = 0;
  return weeks.map((week) => {
    let hasMissedSession = false;

    const sessions: ClientC25kSession[] = week.sessions.map((session) => {
      const p = progressBySessionId.get(session.id);
      let status: SessionLockStatus;
      if (p) {
        status = p.status === "COMPLETED" ? "completed" : "missed";
        if (p.status === "MISSED") hasMissedSession = true;
      } else {
        status = flatIndex === currentFlatIndex ? "current" : "locked";
      }
      const canRevert = !!p && flatIndex === lastResolvedFlatIndex;
      flatIndex++;

      return {
        id: session.id,
        dayLabel: session.dayLabel,
        description: session.description,
        order: session.order,
        status,
        canRevert,
        durationMinutes: p?.durationMinutes ?? null,
        sessionType: p?.sessionType ?? null,
        timeOfDay: p?.timeOfDay ?? null,
        mood: p?.mood ?? null,
      };
    });

    const weekStatus: WeekStatus = sessions.some((s) => s.status === "current")
      ? "current"
      : sessions.every((s) => s.status === "completed" || s.status === "missed")
        ? "complete"
        : "upcoming";

    return {
      id: week.id,
      weekNumber: week.weekNumber,
      title: week.title,
      description: week.description,
      status: weekStatus,
      hasMissedSession,
      sessions,
    };
  });
}

export interface ClientBadge {
  slug: string;
  name: string;
  description: string;
  section: "Weekly" | "Milestones" | "Time" | "Fun";
  earned: boolean;
  earnedAt: string | null;
}

/** The full badge catalog, each marked earned/locked for this runner+cohort —
 * used to render the badge rack (locked badges still show, as something to
 * aim for). */
export async function getRunnerBadges(runnerId: string, cohortId: string): Promise<ClientBadge[]> {
  const earned = await prisma.runnerBadge.findMany({
    where: { runnerId, cohortId },
    include: { badge: true },
  });
  const earnedBySlug = new Map(earned.map((e) => [e.badge.slug, e.earnedAt]));

  return BADGE_DEFINITIONS.map((def) => ({
    slug: def.slug,
    name: def.name,
    description: def.description,
    section: def.section,
    earned: earnedBySlug.has(def.slug),
    earnedAt: earnedBySlug.get(def.slug)?.toISOString() ?? null,
  }));
}

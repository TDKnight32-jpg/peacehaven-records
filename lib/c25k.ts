import { prisma } from "./db";

export interface ClientC25kSession {
  id: string;
  dayLabel: string;
  description: string | null;
  order: number;
  completed: boolean;
}

export interface ClientC25kWeek {
  id: string;
  weekNumber: number;
  title: string;
  description: string | null;
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

/** The full 9-week plan, with per-session completion for the given runner+cohort. */
export async function getPlanWithProgress(runnerId: string, cohortId: string): Promise<ClientC25kWeek[]> {
  const [weeks, progress] = await Promise.all([
    prisma.c25kWeek.findMany({
      orderBy: { weekNumber: "asc" },
      include: { sessions: { orderBy: { order: "asc" } } },
    }),
    prisma.runnerProgress.findMany({ where: { runnerId, cohortId } }),
  ]);

  const completedSessionIds = new Set(progress.map((p) => p.sessionId));

  return weeks.map((week) => ({
    id: week.id,
    weekNumber: week.weekNumber,
    title: week.title,
    description: week.description,
    sessions: week.sessions.map((session) => ({
      id: session.id,
      dayLabel: session.dayLabel,
      description: session.description,
      order: session.order,
      completed: completedSessionIds.has(session.id),
    })),
  }));
}

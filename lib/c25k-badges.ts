import { BadgeKind } from "@prisma/client";
import { prisma } from "./db";

export type BadgeSection = "Weekly" | "Milestones" | "Time" | "Fun";

export interface BadgeDefinition {
  slug: string;
  name: string;
  description: string;
  kind: BadgeKind;
  threshold: number | null;
  section: BadgeSection;
}

const WEEKLY_BADGES: BadgeDefinition[] = Array.from({ length: 9 }, (_, i) => {
  const weekNumber = i + 1;
  return {
    slug: `week-${weekNumber}-complete`,
    name: `Week ${weekNumber} Complete`,
    description: `Complete all of Week ${weekNumber}'s sessions`,
    kind: BadgeKind.WEEKLY_COMPLETE,
    threshold: weekNumber,
    section: "Weekly" as const,
  };
});

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  ...WEEKLY_BADGES,
  {
    slug: "first-run",
    name: "First Run Complete!",
    description: "Tick off your very first session",
    kind: BadgeKind.FIRST_RUN,
    threshold: null,
    section: "Milestones",
  },
  {
    slug: "first-solo-run",
    name: "First Solo Run Complete!",
    description: "Log a session you ran on your own",
    kind: BadgeKind.FIRST_SOLO_RUN,
    threshold: null,
    section: "Milestones",
  },
  {
    slug: "sessions-5",
    name: "5 Sessions",
    description: "Complete 5 sessions",
    kind: BadgeKind.SESSION_COUNT,
    threshold: 5,
    section: "Milestones",
  },
  {
    slug: "sessions-10",
    name: "10 Sessions",
    description: "Complete 10 sessions",
    kind: BadgeKind.SESSION_COUNT,
    threshold: 10,
    section: "Milestones",
  },
  {
    slug: "sessions-15",
    name: "15 Sessions",
    description: "Complete 15 sessions",
    kind: BadgeKind.SESSION_COUNT,
    threshold: 15,
    section: "Milestones",
  },
  {
    slug: "sessions-20",
    name: "20 Sessions",
    description: "Complete 20 sessions",
    kind: BadgeKind.SESSION_COUNT,
    threshold: 20,
    section: "Milestones",
  },
  {
    slug: "sessions-27",
    name: "Programme Complete",
    description: "Complete all 27 sessions",
    kind: BadgeKind.SESSION_COUNT,
    threshold: 27,
    section: "Milestones",
  },
  {
    slug: "time-10",
    name: "10 Min Club",
    description: "Log 10 minutes of running in total",
    kind: BadgeKind.TIME_TOTAL,
    threshold: 10,
    section: "Time",
  },
  {
    slug: "time-20",
    name: "20 Min Club",
    description: "Log 20 minutes of running in total",
    kind: BadgeKind.TIME_TOTAL,
    threshold: 20,
    section: "Time",
  },
  {
    slug: "time-40",
    name: "40 Min Club",
    description: "Log 40 minutes of running in total",
    kind: BadgeKind.TIME_TOTAL,
    threshold: 40,
    section: "Time",
  },
  {
    slug: "time-60",
    name: "1 Hour Club",
    description: "Log 1 hour of running in total",
    kind: BadgeKind.TIME_TOTAL,
    threshold: 60,
    section: "Time",
  },
  {
    slug: "time-120",
    name: "2 Hour Club",
    description: "Log 2 hours of running in total",
    kind: BadgeKind.TIME_TOTAL,
    threshold: 120,
    section: "Time",
  },
  {
    slug: "time-180",
    name: "3 Hour Club",
    description: "Log 3 hours of running in total",
    kind: BadgeKind.TIME_TOTAL,
    threshold: 180,
    section: "Time",
  },
  {
    slug: "early-bird",
    name: "Early Bird",
    description: "Log a session that started before 8am",
    kind: BadgeKind.EARLY_BIRD,
    threshold: null,
    section: "Fun",
  },
  {
    slug: "night-owl",
    name: "Night Owl",
    description: "Log a session that started at or after 8pm",
    kind: BadgeKind.NIGHT_OWL,
    threshold: null,
    section: "Fun",
  },
  {
    slug: "perfect-week",
    name: "Perfect Week",
    description: "Complete all 3 sessions of a week within 7 days of each other",
    kind: BadgeKind.PERFECT_WEEK,
    threshold: null,
    section: "Fun",
  },
];

function timeOfDayHour(timeOfDay: string): number {
  return Number(timeOfDay.split(":")[0]);
}

/**
 * Re-checks every badge kind against the runner's current progress in this
 * cohort and awards any newly-earned ones, returning just those (so a
 * caller — see actions.ts#setSessionStatus — can show them in the
 * completion celebration). Safe to call after every RunnerProgress change
 * (toggling a session, or logging its duration/type/time) —
 * already-earned badges are never re-evaluated or revoked, and
 * `skipDuplicates` makes this idempotent under concurrent calls.
 */
export async function evaluateAndAwardBadges(
  runnerId: string,
  cohortId: string,
): Promise<{ slug: string; name: string }[]> {
  const [weeks, progress, badges, earned] = await Promise.all([
    prisma.c25kWeek.findMany({ orderBy: { weekNumber: "asc" }, include: { sessions: true } }),
    prisma.runnerProgress.findMany({ where: { runnerId, cohortId, status: "COMPLETED" } }),
    prisma.badge.findMany(),
    prisma.runnerBadge.findMany({ where: { runnerId, cohortId }, select: { badgeId: true } }),
  ]);

  const earnedBadgeIds = new Set(earned.map((e) => e.badgeId));
  const badgeBySlug = new Map(badges.map((b) => [b.slug, b]));

  const sessionToWeekId = new Map<string, string>();
  const weekTotals = new Map<string, number>();
  const weekNumberToId = new Map<number, string>();
  for (const week of weeks) {
    weekTotals.set(week.id, week.sessions.length);
    weekNumberToId.set(week.weekNumber, week.id);
    for (const session of week.sessions) sessionToWeekId.set(session.id, week.id);
  }

  const completedCount = progress.length;
  const totalMinutes = progress.reduce((sum, p) => sum + (p.durationMinutes ?? 0), 0);
  const hasSolo = progress.some((p) => p.sessionType === "SOLO");
  const hasEarlyBird = progress.some((p) => p.timeOfDay !== null && timeOfDayHour(p.timeOfDay) < 8);
  const hasNightOwl = progress.some((p) => p.timeOfDay !== null && timeOfDayHour(p.timeOfDay) >= 20);

  const completedByWeek = new Map<string, { count: number; timestamps: number[] }>();
  for (const p of progress) {
    const weekId = sessionToWeekId.get(p.sessionId);
    if (!weekId) continue;
    const entry = completedByWeek.get(weekId) ?? { count: 0, timestamps: [] };
    entry.count += 1;
    entry.timestamps.push(p.completedAt.getTime());
    completedByWeek.set(weekId, entry);
  }

  function isWeekComplete(weekNumber: number): boolean {
    const weekId = weekNumberToId.get(weekNumber);
    if (!weekId) return false;
    const entry = completedByWeek.get(weekId);
    return !!entry && entry.count >= (weekTotals.get(weekId) ?? Infinity);
  }

  const hasPerfectWeek = weeks.some((week) => {
    const entry = completedByWeek.get(week.id);
    if (!entry || entry.count < (weekTotals.get(week.id) ?? Infinity)) return false;
    const span = Math.max(...entry.timestamps) - Math.min(...entry.timestamps);
    return span <= 7 * 24 * 60 * 60 * 1000;
  });

  const toAward: { runnerId: string; badgeId: string; cohortId: string }[] = [];
  const newlyAwarded: { slug: string; name: string }[] = [];

  for (const def of BADGE_DEFINITIONS) {
    const badge = badgeBySlug.get(def.slug);
    if (!badge || earnedBadgeIds.has(badge.id)) continue;

    let qualifies: boolean;
    switch (def.kind) {
      case BadgeKind.FIRST_RUN:
        qualifies = completedCount >= 1;
        break;
      case BadgeKind.FIRST_SOLO_RUN:
        qualifies = hasSolo;
        break;
      case BadgeKind.SESSION_COUNT:
        qualifies = completedCount >= (def.threshold ?? Infinity);
        break;
      case BadgeKind.TIME_TOTAL:
        qualifies = totalMinutes >= (def.threshold ?? Infinity);
        break;
      case BadgeKind.WEEKLY_COMPLETE:
        qualifies = isWeekComplete(def.threshold ?? -1);
        break;
      case BadgeKind.EARLY_BIRD:
        qualifies = hasEarlyBird;
        break;
      case BadgeKind.NIGHT_OWL:
        qualifies = hasNightOwl;
        break;
      case BadgeKind.PERFECT_WEEK:
        qualifies = hasPerfectWeek;
        break;
    }

    if (qualifies) {
      toAward.push({ runnerId, badgeId: badge.id, cohortId });
      newlyAwarded.push({ slug: def.slug, name: def.name });
    }
  }

  if (toAward.length > 0) {
    await prisma.runnerBadge.createMany({ data: toAward, skipDuplicates: true });
  }

  return newlyAwarded;
}

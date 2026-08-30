import { prisma } from "./db";

export type Category = "M" | "F";

export interface ClientGpEvent {
  id: string;
  slug: string;
  name: string;
  date: string;
  distanceSlug: string | null;
  distanceName: string | null;
  scoringType: string;
  isSussexGp: boolean;
  sortOrder: number;
}

export interface ClientGpResult {
  id: string;
  category: Category;
  runnerName: string;
  runnerSlug: string;
  result: string | null;
  rawTime: string | null;
  predictedTime: string | null;
  position: number | null;
  points: number | null;
  isVolunteer: boolean;
}

export interface LeaderboardEventScore {
  eventSlug: string;
  eventName: string;
  eventDate: string;
  points: number;
  counted: boolean;
}

export interface LeaderboardRow {
  runnerId: string;
  runnerName: string;
  runnerSlug: string;
  category: Category;
  totalPoints: number;
  eventsCounted: number;
  eventsEntered: number;
  scores: LeaderboardEventScore[];
}

/** Each runner's total is their best 8 scores out of however many events
 * they've entered (not best 8 of a fixed 16) — so a runner with 5 entries
 * counts all 5, and one with 20 counts their top 8. */
const BEST_OF = 8;

function toClientEvent(row: {
  id: string;
  slug: string;
  name: string;
  date: Date;
  scoringType: string;
  isSussexGp: boolean;
  sortOrder: number;
  distance: { slug: string; name: string } | null;
}): ClientGpEvent {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    date: row.date.toISOString(),
    distanceSlug: row.distance?.slug ?? null,
    distanceName: row.distance?.name ?? null,
    scoringType: row.scoringType,
    isSussexGp: row.isSussexGp,
    sortOrder: row.sortOrder,
  };
}

export async function getGpEvents(): Promise<ClientGpEvent[]> {
  const rows = await prisma.gpEvent.findMany({
    include: { distance: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toClientEvent);
}

export async function getGpEvent(
  slug: string,
): Promise<{ event: ClientGpEvent; results: ClientGpResult[] } | null> {
  const row = await prisma.gpEvent.findUnique({
    where: { slug },
    include: { distance: true, results: { include: { runner: true } } },
  });
  if (!row) return null;

  const results: ClientGpResult[] = row.results
    .map((r) => ({
      id: r.id,
      category: r.category as Category,
      runnerName: r.runner.name,
      runnerSlug: r.runner.slug,
      result: r.result,
      rawTime: r.rawTime,
      predictedTime: r.predictedTime,
      position: r.position,
      points: r.points,
      isVolunteer: r.isVolunteer,
    }))
    .sort((a, b) => (a.position ?? Infinity) - (b.position ?? Infinity));

  return { event: toClientEvent(row), results };
}

export async function getGpLeaderboard(): Promise<LeaderboardRow[]> {
  const results = await prisma.gpResult.findMany({
    where: { points: { not: null } },
    include: { runner: true, event: true },
  });

  const byRunnerCategory = new Map<string, LeaderboardRow>();

  for (const r of results) {
    const key = `${r.runnerId}:${r.category}`;
    if (!byRunnerCategory.has(key)) {
      byRunnerCategory.set(key, {
        runnerId: r.runnerId,
        runnerName: r.runner.name,
        runnerSlug: r.runner.slug,
        category: r.category as Category,
        totalPoints: 0,
        eventsCounted: 0,
        eventsEntered: 0,
        scores: [],
      });
    }
    byRunnerCategory.get(key)!.scores.push({
      eventSlug: r.event.slug,
      eventName: r.event.name,
      eventDate: r.event.date.toISOString(),
      points: r.points!,
      counted: false, // resolved below, once every result for this runner is collected
    });
  }

  const rows = [...byRunnerCategory.values()];
  for (const row of rows) {
    row.scores.sort((a, b) => b.points - a.points);
    row.eventsEntered = row.scores.length;
    row.eventsCounted = Math.min(BEST_OF, row.scores.length);
    row.scores.forEach((s, i) => {
      s.counted = i < BEST_OF;
    });
    row.totalPoints = row.scores.slice(0, BEST_OF).reduce((sum, s) => sum + s.points, 0);
    row.scores.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }

  rows.sort((a, b) => a.category.localeCompare(b.category) || b.totalPoints - a.totalPoints);
  return rows;
}

export async function getGpRunner(
  slug: string,
): Promise<{ runnerId: string; runnerName: string; runnerSlug: string; results: (ClientGpResult & { eventSlug: string; eventName: string; eventDate: string })[]; leaderboardByCategory: Record<Category, LeaderboardRow | null> } | null> {
  const runner = await prisma.runner.findUnique({
    where: { slug },
    include: { results: { include: { event: true }, orderBy: { event: { date: "desc" } } } },
  });
  if (!runner) return null;

  const results = runner.results.map((r) => ({
    id: r.id,
    category: r.category as Category,
    runnerName: runner.name,
    runnerSlug: runner.slug,
    result: r.result,
    rawTime: r.rawTime,
    predictedTime: r.predictedTime,
    position: r.position,
    points: r.points,
    isVolunteer: r.isVolunteer,
    eventSlug: r.event.slug,
    eventName: r.event.name,
    eventDate: r.event.date.toISOString(),
  }));

  const leaderboard = await getGpLeaderboard();
  const leaderboardByCategory: Record<Category, LeaderboardRow | null> = {
    M: leaderboard.find((row) => row.runnerId === runner.id && row.category === "M") ?? null,
    F: leaderboard.find((row) => row.runnerId === runner.id && row.category === "F") ?? null,
  };

  return {
    runnerId: runner.id,
    runnerName: runner.name,
    runnerSlug: runner.slug,
    results,
    leaderboardByCategory,
  };
}

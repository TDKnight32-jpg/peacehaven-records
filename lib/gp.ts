import { prisma } from "./db";

export type Category = "M" | "F";

export interface ClientGpEvent {
  id: string;
  slug: string;
  name: string;
  date: string;
  isUpcoming: boolean;
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
  isVolunteer: boolean;
  /** For a race score: whether it landed in the best-8 and so counts toward
   * `racePoints`. For a volunteer score: always true — volunteering never
   * competes for a race slot, every credit counts. */
  counted: boolean;
}

export interface LeaderboardRow {
  runnerId: string;
  runnerName: string;
  runnerSlug: string;
  category: Category;
  /** Competition ranking within this category — ties share a rank and the
   * next distinct total skips ahead (1, 2, 2, 4), not a plain 1-of-N index. */
  rank: number;
  /** Best 8 of `raceEventsEntered` race results, at full value — volunteer
   * credits never displace a race result from this count. */
  racePoints: number;
  /** 1 flat point per race beyond the best 8 ("dropped") — a participation
   * credit, not their actual score in that race. */
  participationPoints: number;
  droppedRaceCount: number;
  /** Sum of every volunteer credit, uncapped — always added on top. */
  volunteerPoints: number;
  totalPoints: number;
  raceEventsCounted: number;
  raceEventsEntered: number;
  volunteerEvents: number;
  scores: LeaderboardEventScore[];
}

/** Up/down places moved between two standings snapshots for one runner —
 * see computeMovements(). `direction: null` covers both "no change" and "no
 * prior snapshot" (nothing to compare against, e.g. a runner's debut race)
 * — both render with no indicator, so callers don't need to tell them apart. */
export interface StandingMovement {
  direction: "up" | "down" | null;
  places: number;
}

/** Each runner's race total is their best 8 race scores, at full value, out
 * of however many races they've entered (not best 8 of a fixed 16) — so a
 * runner with 5 entries counts all 5, and one with 20 counts their top 8.
 * Every race beyond the best 8 ("dropped") still earns a flat participation
 * credit rather than nothing, stacking per dropped race. Volunteer credits
 * never compete for one of the best-8 slots; every volunteer credit is
 * summed uncapped and added on top as a bonus. */
const BEST_OF = 8;
const PARTICIPATION_CREDIT = 1;

/** Ranks entries by points descending — volunteer credits and entries with
 * no points excluded, since neither is a race placing — and returns each
 * entry's 1-indexed rank keyed by id. Shared by every "club position" or
 * "top 3" computation in the GP section (event pages, and each of a
 * runner's results below), so they all agree on what "ranked by points"
 * means. */
export function rankByPoints<T extends { id: string; isVolunteer: boolean; points: number | null }>(
  entries: T[],
): Map<string, number> {
  const ranked = entries
    .filter((e) => !e.isVolunteer && e.points !== null)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const positions = new Map<string, number>();
  ranked.forEach((e, i) => positions.set(e.id, i + 1));
  return positions;
}

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
    isUpcoming: row.date.getTime() > Date.now(),
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

/** @param asOf — when given, only counts results from events dated on or
 * before this date, producing a snapshot of the standings as they stood at
 * that point in the season (used for the position-movement indicators). */
export async function getGpLeaderboard(asOf?: Date): Promise<LeaderboardRow[]> {
  const results = await prisma.gpResult.findMany({
    where: {
      points: { not: null },
      ...(asOf ? { event: { date: { lte: asOf } } } : {}),
    },
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
        rank: 0,
        racePoints: 0,
        participationPoints: 0,
        droppedRaceCount: 0,
        volunteerPoints: 0,
        totalPoints: 0,
        raceEventsCounted: 0,
        raceEventsEntered: 0,
        volunteerEvents: 0,
        scores: [],
      });
    }
    byRunnerCategory.get(key)!.scores.push({
      eventSlug: r.event.slug,
      eventName: r.event.name,
      eventDate: r.event.date.toISOString(),
      points: r.points!,
      isVolunteer: r.isVolunteer,
      counted: false, // resolved below, once every result for this runner is collected
    });
  }

  const rows = [...byRunnerCategory.values()];
  for (const row of rows) {
    const raceScores = row.scores.filter((s) => !s.isVolunteer).sort((a, b) => b.points - a.points);
    const volunteerScores = row.scores.filter((s) => s.isVolunteer);

    row.raceEventsEntered = raceScores.length;
    row.raceEventsCounted = Math.min(BEST_OF, raceScores.length);
    raceScores.forEach((s, i) => {
      s.counted = i < BEST_OF;
    });
    row.racePoints = raceScores.slice(0, BEST_OF).reduce((sum, s) => sum + s.points, 0);

    row.droppedRaceCount = Math.max(0, raceScores.length - BEST_OF);
    row.participationPoints = row.droppedRaceCount * PARTICIPATION_CREDIT;

    volunteerScores.forEach((s) => {
      s.counted = true;
    });
    row.volunteerEvents = volunteerScores.length;
    row.volunteerPoints = volunteerScores.reduce((sum, s) => sum + s.points, 0);

    row.totalPoints = row.racePoints + row.participationPoints + row.volunteerPoints;
    row.scores.sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }

  rows.sort((a, b) => a.category.localeCompare(b.category) || b.totalPoints - a.totalPoints);

  // Competition ranking (1, 2, 2, 4) within each category: ties share a
  // rank, and the next distinct total skips ahead to its 1-indexed position.
  let position = 0;
  let lastCategory: Category | null = null;
  let lastPoints: number | null = null;
  let lastRank = 0;
  for (const row of rows) {
    if (row.category !== lastCategory) {
      position = 0;
      lastPoints = null;
      lastCategory = row.category;
    }
    position++;
    if (row.totalPoints !== lastPoints) {
      lastRank = position;
      lastPoints = row.totalPoints;
    }
    row.rank = lastRank;
  }

  return rows;
}

/** Places moved between two standings snapshots, keyed by `${runnerSlug}:${category}`
 * — slug rather than id so it works equally for LeaderboardRow[] (which has
 * runnerId) and result rows shaped like ClientGpResult (which don't). */
export function computeMovements(
  current: LeaderboardRow[],
  prior: LeaderboardRow[],
): Map<string, StandingMovement> {
  const priorRankByKey = new Map(prior.map((r) => [`${r.runnerSlug}:${r.category}`, r.rank]));
  const movements = new Map<string, StandingMovement>();
  for (const row of current) {
    const key = `${row.runnerSlug}:${row.category}`;
    const priorRank = priorRankByKey.get(key);
    if (priorRank === undefined) {
      movements.set(key, { direction: null, places: 0 });
      continue;
    }
    const delta = priorRank - row.rank; // positive => rank number went down => moved up
    movements.set(key, delta === 0 ? { direction: null, places: 0 } : { direction: delta > 0 ? "up" : "down", places: Math.abs(delta) });
  }
  return movements;
}

/** The date of the second-most-recent event that actually has results —
 * i.e. "as of just before the latest event was applied". Events with no
 * results yet (upcoming, not yet run) don't count as a snapshot point since
 * there's nothing for them to have changed. Returns null if fewer than two
 * results-bearing events exist yet. */
export async function getSecondMostRecentResultsEventDate(): Promise<Date | null> {
  const events = await prisma.gpEvent.findMany({
    where: { results: { some: {} } },
    orderBy: { date: "desc" },
    take: 2,
    select: { date: true },
  });
  return events[1]?.date ?? null;
}

/** The date of the results-bearing event immediately before `beforeDate` —
 * used on an event page to compare standings just after that event to
 * standings just before it (i.e. as of the *previous* race, not the latest
 * race overall). Returns null if there's no earlier results-bearing event. */
export async function getPreviousResultsEventDate(beforeDate: Date): Promise<Date | null> {
  const prev = await prisma.gpEvent.findFirst({
    where: { date: { lt: beforeDate }, results: { some: {} } },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  return prev?.date ?? null;
}

export async function getGpRunner(
  slug: string,
): Promise<{ runnerId: string; runnerName: string; runnerSlug: string; results: (ClientGpResult & { eventSlug: string; eventName: string; eventDate: string; clubPosition: number | null })[]; leaderboardByCategory: Record<Category, LeaderboardRow | null> } | null> {
  const runner = await prisma.runner.findUnique({
    where: { slug },
    include: { results: { include: { event: true }, orderBy: { event: { date: "desc" } } } },
  });
  if (!runner) return null;

  // Club Pos (this runner's rank among just the club's entrants for that
  // event+category — same idea as the event pages' Club Pos column) needs
  // every other runner's result at each of these events, not just this
  // runner's own rows, so it's one extra batched query rather than N.
  const eventIds = [...new Set(runner.results.map((r) => r.eventId))];
  const fieldResults = await prisma.gpResult.findMany({
    where: { eventId: { in: eventIds } },
    select: { id: true, eventId: true, category: true, isVolunteer: true, points: true },
  });
  const byEventCategory = new Map<string, typeof fieldResults>();
  for (const r of fieldResults) {
    const key = `${r.eventId}:${r.category}`;
    if (!byEventCategory.has(key)) byEventCategory.set(key, []);
    byEventCategory.get(key)!.push(r);
  }
  const clubPositionByResultId = new Map<string, number>();
  for (const group of byEventCategory.values()) {
    for (const [id, rank] of rankByPoints(group)) clubPositionByResultId.set(id, rank);
  }

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
    clubPosition: clubPositionByResultId.get(r.id) ?? null,
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

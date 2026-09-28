import type { Category, LeaderboardRow } from "./gp";

/** One callout winner (or several, when tied) for one category. */
export interface HighlightWinner {
  runners: { name: string; slug: string }[];
  /** e.g. "▲ 11 places" or "19.3 pts per race · 3 races" */
  detail: string;
}

export type CategoryHighlights = Record<Category, HighlightWinner | null>;

/** "Best newcomer" is limited to runners with this many races — at least
 * 2 so one lucky race can't win it, at most 3 ("a handful"). */
const NEWCOMER_MIN_RACES = 2;
const NEWCOMER_MAX_RACES = 3;

const CATEGORIES: Category[] = ["F", "M"];

function toWinner(rows: LeaderboardRow[], detail: string): HighlightWinner {
  return { runners: rows.map((r) => ({ name: r.runnerName, slug: r.runnerSlug })), detail };
}

/**
 * Most places climbed since the previous results-bearing event, per
 * category — the same before/after comparison as the leaderboard's ▲
 * arrows. Runners new to the table have no previous place and can't win.
 * Ties are all shown; null when nobody climbed (e.g. after the first race).
 */
export function mostImproved(current: LeaderboardRow[], prior: LeaderboardRow[]): CategoryHighlights {
  const priorRank = new Map(prior.map((r) => [`${r.runnerSlug}:${r.category}`, r.rank]));
  const result = { F: null, M: null } as CategoryHighlights;
  for (const c of CATEGORIES) {
    const climbs = current
      .filter((r) => r.category === c && priorRank.has(`${r.runnerSlug}:${c}`))
      .map((r) => ({ row: r, climb: priorRank.get(`${r.runnerSlug}:${c}`)! - r.rank }));
    const best = Math.max(0, ...climbs.map((x) => x.climb));
    if (best === 0) continue;
    const winners = climbs.filter((x) => x.climb === best).map((x) => x.row);
    result[c] = toWinner(winners, `▲ ${best} place${best === 1 ? "" : "s"}`);
  }
  return result;
}

/**
 * Highest average race points among runners with 2–3 races, per category.
 * Volunteer credits aren't counted (they're not a race score). With at most
 * 3 races, every race counts toward `racePoints`, so it's their true
 * average. Tie-break: more races, then higher race total; anyone still
 * level shares the callout.
 */
export function bestNewcomer(current: LeaderboardRow[]): CategoryHighlights {
  const result = { F: null, M: null } as CategoryHighlights;
  for (const c of CATEGORIES) {
    const eligible = current
      .filter(
        (r) =>
          r.category === c && r.raceEventsEntered >= NEWCOMER_MIN_RACES && r.raceEventsEntered <= NEWCOMER_MAX_RACES,
      )
      .map((r) => ({ row: r, avg: r.racePoints / r.raceEventsEntered }));
    if (eligible.length === 0) continue;
    const better = (a: (typeof eligible)[number], b: (typeof eligible)[number]) =>
      b.avg - a.avg || b.row.raceEventsEntered - a.row.raceEventsEntered || b.row.racePoints - a.row.racePoints;
    eligible.sort(better);
    const winners = eligible.filter((x) => better(x, eligible[0]) === 0).map((x) => x.row);
    const top = eligible[0];
    result[c] = toWinner(winners, `${Number(top.avg.toFixed(1))} pts per race · ${top.row.raceEventsEntered} races`);
  }
  return result;
}

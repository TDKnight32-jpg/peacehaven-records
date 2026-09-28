import type { Category, ClientGpResult, LeaderboardRow } from "./gp";

/** One item in the Grand Prix homepage's news ticker. `kind` picks the icon;
 * `category` (when set) is shown as a WOMEN / MEN tag before the text. */
export interface Headline {
  kind: "info" | "leader" | "winner" | "podium" | "gap" | "climber" | "newcomers" | "volunteers";
  category: Category | null;
  text: string;
}

/** Podium spread (1st minus 3rd, in points) at or under which the top of a
 * table counts as "tight" and earns its own headline. */
const CLOSE_GAP_POINTS = 10;
/** A climb has to be at least this many places to make the ticker — moving
 * up one place happens to half the table every race and isn't news. */
const MIN_CLIMB_PLACES = 2;
const MAX_CLIMBERS_PER_TABLE = 3;
/** Beyond this many names, a newcomer/volunteer list is summarised as
 * "A, B, C and N others" so one headline doesn't take over the strip. */
const MAX_NAMES_LISTED = 5;

const CATEGORIES: Category[] = ["F", "M"];
const CATEGORY_WORD: Record<Category, string> = { F: "women", M: "men" };

function pts(n: number): string {
  return `${n} pt${n === 1 ? "" : "s"}`;
}

function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** "A", "A and B", "A, B and C" — or "A, B, C, D, E and 3 others" past MAX_NAMES_LISTED. */
function joinNames(names: string[]): string {
  if (names.length > MAX_NAMES_LISTED) {
    const extra = names.length - MAX_NAMES_LISTED;
    return `${names.slice(0, MAX_NAMES_LISTED).join(", ")} and ${extra} other${extra === 1 ? "" : "s"}`;
  }
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Joins per-table groups ("A (women)", "B and C (men)") — with "and"
 * normally, but "; " when a group already contains an "and", so it never
 * reads "A and B (women) and C (men)". */
function joinGroups(groups: { names: string[]; label: string }[]): string {
  const parts = groups.map((g) => `${joinNames(g.names)} (${g.label})`);
  return parts.join(groups.some((g) => g.names.length > 1) ? "; " : " and ");
}

/** Rank as a phrase, marking shared places: "3rd" or "joint 3rd". */
function place(row: LeaderboardRow, table: LeaderboardRow[]): string {
  const shared = table.filter((r) => r.rank === row.rank).length > 1;
  return `${shared ? "joint " : ""}${ordinal(row.rank)}`;
}

function leaderHeadline(now: LeaderboardRow[], before: LeaderboardRow[], category: Category): Headline {
  const leaders = now.filter((r) => r.rank === 1);
  const prevLeaders = before.filter((r) => r.rank === 1);
  const prevLeaderSlugs = new Set(prevLeaders.map((r) => r.runnerSlug));
  const top = leaders[0];

  if (leaders.length > 1) {
    const names = joinNames(leaders.map((r) => r.runnerName));
    const unchanged = leaders.length === prevLeaders.length && leaders.every((r) => prevLeaderSlugs.has(r.runnerSlug));
    return {
      kind: "leader",
      category,
      text: unchanged
        ? `${names} still share the lead on ${pts(top.totalPoints)}`
        : `${names} are now tied for the lead on ${pts(top.totalPoints)}`,
    };
  }

  // Sole leader. Describe the margin over whoever's next (by name if one
  // runner, "joint 2nd" if several share it) — unless they're alone in the table.
  const chasers = now.filter((r) => r.rank === now.find((x) => x.rank > 1)?.rank);
  const lead = chasers.length > 0 ? top.totalPoints - chasers[0].totalPoints : null;
  const chaserName = chasers.length === 1 ? chasers[0].runnerName : "joint 2nd";

  if (prevLeaderSlugs.has(top.runnerSlug) && prevLeaders.length > 1) {
    return {
      kind: "leader",
      category,
      text: `${top.runnerName} breaks the tie to lead outright${lead !== null ? `, ${pts(lead)} ahead of ${chaserName}` : ""}`,
    };
  }
  if (!prevLeaderSlugs.has(top.runnerSlug)) {
    const overtook = prevLeaders.length > 0 ? `, overtaking ${joinNames(prevLeaders.map((r) => r.runnerName))}` : "";
    const margin = lead !== null ? ` by ${pts(lead)}` : "";
    return { kind: "leader", category, text: `${top.runnerName} takes the lead${margin}${overtook}` };
  }

  // Same sole leader as before — say whether the lead grew or shrank.
  if (lead === null) return { kind: "leader", category, text: `${top.runnerName} stays top` };
  const prevChaser = before.find((r) => r.rank > 1);
  const prevLead = prevChaser ? prevLeaders[0].totalPoints - prevChaser.totalPoints : null;
  let text = `${top.runnerName} stays top, ${pts(lead)} clear of ${chaserName}`;
  if (prevLead !== null && lead > prevLead) text = `${top.runnerName} extends the lead to ${pts(lead)} over ${chaserName}`;
  if (prevLead !== null && lead < prevLead) text = `${top.runnerName} stays top, lead cut to ${pts(lead)} over ${chaserName}`;
  return { kind: "leader", category, text };
}

/** Headlines for one table (women's or men's), comparing standings just
 * after the latest race (`now`) with just before it (`before`). */
function tableHeadlines(now: LeaderboardRow[], before: LeaderboardRow[], category: Category) {
  const leader = leaderHeadline(now, before, category);
  const prevRankBySlug = new Map(before.map((r) => [r.runnerSlug, r.rank]));
  const mentioned = new Set(now.filter((r) => r.rank === 1).map((r) => r.runnerSlug));

  const podium: Headline[] = [];
  const prevPodium = before.filter((r) => r.rank <= 3);
  const prevPodiumSlugs = new Set(prevPodium.map((r) => r.runnerSlug));
  const podiumSlugs = new Set(now.filter((r) => r.rank <= 3).map((r) => r.runnerSlug));
  for (const r of now) {
    if (r.rank > 3 || r.rank === 1 || prevPodiumSlugs.has(r.runnerSlug)) continue;
    podium.push({ kind: "podium", category, text: `${r.runnerName} moves onto the podium in ${place(r, now)}` });
    mentioned.add(r.runnerSlug);
  }
  for (const r of prevPodium) {
    if (podiumSlugs.has(r.runnerSlug)) continue;
    const nowRow = now.find((x) => x.runnerSlug === r.runnerSlug);
    if (!nowRow) continue;
    podium.push({ kind: "podium", category, text: `${r.runnerName} drops out of the top 3 to ${place(nowRow, now)}` });
    mentioned.add(r.runnerSlug);
  }

  const gap: Headline[] = [];
  if (now.length >= 3 && now.filter((r) => r.rank === 1).length === 1) {
    const spread = now[0].totalPoints - now[2].totalPoints;
    if (spread <= CLOSE_GAP_POINTS) {
      gap.push({ kind: "gap", category, text: `Tight at the top: just ${pts(spread)} between 1st and 3rd` });
    }
  }

  const climbers: Headline[] = now
    .filter((r) => !mentioned.has(r.runnerSlug) && prevRankBySlug.has(r.runnerSlug))
    .map((r) => ({ row: r, climb: prevRankBySlug.get(r.runnerSlug)! - r.rank }))
    .filter((c) => c.climb >= MIN_CLIMB_PLACES)
    .sort((a, b) => b.climb - a.climb || a.row.rank - b.row.rank)
    .slice(0, MAX_CLIMBERS_PER_TABLE)
    .map(({ row, climb }) => ({
      kind: "climber",
      category,
      text: `${row.runnerName} climbs ${climb} places to ${place(row, now)}`,
    }));

  const newcomers = now.filter((r) => !prevRankBySlug.has(r.runnerSlug)).map((r) => r.runnerName);

  return { leader, podium, gap, climbers, newcomers };
}

/** Top non-volunteer score per category at the latest race, ties included. */
function winnerHeadline(eventName: string, results: ClientGpResult[]): Headline | null {
  const groups: { names: string[]; label: string }[] = [];
  for (const c of CATEGORIES) {
    const scored = results.filter((r) => r.category === c && !r.isVolunteer && r.points !== null);
    if (scored.length === 0) continue;
    const best = Math.max(...scored.map((r) => r.points!));
    const names = scored.filter((r) => r.points === best).map((r) => r.runnerName);
    groups.push({ names, label: `${CATEGORY_WORD[c]}, ${pts(best)}` });
  }
  if (groups.length === 0) return null;
  const plural = groups.length > 1 || groups[0].names.length > 1;
  return { kind: "winner", category: null, text: `${eventName}: top score${plural ? "s" : ""} to ${joinGroups(groups)}` };
}

function volunteerHeadline(eventName: string, results: ClientGpResult[]): Headline | null {
  const names = [...new Set(results.filter((r) => r.isVolunteer).map((r) => r.runnerName))];
  if (names.length === 0) return null;
  return { kind: "volunteers", category: null, text: `Thanks to our ${eventName} volunteers: ${joinNames(names)}` };
}

/**
 * Builds the ticker's headlines from the leaderboard just after the latest
 * results-bearing race (`current`) and just before it (`prior` — empty when
 * that race is the first of the season). Both come from getGpLeaderboard(),
 * so they use exactly the scoring the leaderboard itself shows.
 *
 * Returns [] when there are no results at all (the ticker hides itself).
 * Otherwise there's always at least one headline — each table always gets a
 * leader headline, even when nothing changed ("X stays top").
 */
export function buildHeadlines(input: {
  current: LeaderboardRow[];
  prior: LeaderboardRow[];
  latestEvent: { name: string; results: ClientGpResult[] } | null;
}): Headline[] {
  const { current, prior } = input;
  if (!input.latestEvent || current.length === 0) return [];
  // Former members are already absent from the leaderboard snapshots; keep
  // them out of the race-level headlines (top score, volunteers) too.
  const latestEvent = { ...input.latestEvent, results: input.latestEvent.results.filter((r) => !r.runnerIsFormerMember) };

  // Sheet tab names sometimes carry stray double spaces ("Seaford  Beach parkrun").
  const eventName = latestEvent.name.replace(/\s+/g, " ").trim();
  const tables = CATEGORIES.map((c) => ({
    category: c,
    now: current.filter((r) => r.category === c),
    before: prior.filter((r) => r.category === c),
  })).filter((t) => t.now.length > 0);

  if (prior.length === 0) {
    const leaders = tables.map((t) => {
      const top = t.now.filter((r) => r.rank === 1);
      return `${joinNames(top.map((r) => r.runnerName))} ${top.length > 1 ? "share the lead in" : "leads"} the ${CATEGORY_WORD[t.category]}'s table`;
    });
    const volunteers = volunteerHeadline(eventName, latestEvent.results);
    return [
      { kind: "info", category: null, text: `First results are in from ${eventName}!` },
      ...tables.map((t, i): Headline => ({ kind: "leader", category: t.category, text: leaders[i] })),
      ...(volunteers ? [volunteers] : []),
    ];
  }

  const perTable = tables.map((t) => ({ category: t.category, ...tableHeadlines(t.now, t.before, t.category) }));
  const newcomerParts = perTable
    .filter((t) => t.newcomers.length > 0)
    .map((t) => ({ names: t.newcomers, label: CATEGORY_WORD[t.category] }));

  const winner = winnerHeadline(eventName, latestEvent.results);
  const volunteers = volunteerHeadline(eventName, latestEvent.results);

  return [
    { kind: "info", category: null, text: `Standings after ${eventName}` },
    ...perTable.map((t) => t.leader),
    ...(winner ? [winner] : []),
    ...perTable.flatMap((t) => t.podium),
    ...perTable.flatMap((t) => t.gap),
    ...perTable.flatMap((t) => t.climbers),
    ...(newcomerParts.length > 0
      ? [{ kind: "newcomers" as const, category: null, text: `Welcome to the standings: ${joinGroups(newcomerParts)}` }]
      : []),
    ...(volunteers ? [volunteers] : []),
  ];
}

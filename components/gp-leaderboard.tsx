"use client";

import { useState } from "react";
import Link from "next/link";
import type { LeaderboardRow, StandingMovement } from "@/lib/gp";
import { ToggleGroup } from "./toggle-group";
import { MovementIndicator } from "./gp-movement-indicator";

type CategoryFilter = "ALL" | "M" | "F";

const CATEGORY_OPTIONS = [
  { value: "ALL" as CategoryFilter, label: "All" },
  { value: "F" as CategoryFilter, label: "Women's" },
  { value: "M" as CategoryFilter, label: "Men's" },
];

const CATEGORY_SECTION_LABEL: Record<"M" | "F", string> = { F: "Women's", M: "Men's" };

interface RankStyle {
  container: string;
  rank: string;
  name: string;
  points: string;
}

/** Top 3 get a medal-tinted background, a matching 4px left border (thicker
 * than a plain row's border so it reads clearly against the lighter
 * background), and name/points sizes that taper down from rank 1. Rank 4+
 * gets a plain white card with a thin all-around border — its own
 * `border-l-[4px] border-l-transparent` keeps its left edge the same width
 * as the medal rows so nothing shifts horizontally between them. */
function rankStyle(rank: number): RankStyle {
  switch (rank) {
    case 1:
      return {
        container: "bg-gp-row-gold border-l-[4px] border-l-gp-gold-edge",
        rank: "text-gp-gold",
        name: "text-foreground text-[20px]",
        points: "text-foreground text-[26px]",
      };
    case 2:
      return {
        container: "bg-gp-row-silver border-l-[4px] border-l-gp-silver-edge",
        rank: "text-gp-silver",
        name: "text-foreground text-[18px]",
        points: "text-foreground text-[23px]",
      };
    case 3:
      return {
        container: "bg-gp-row-bronze border-l-[4px] border-l-gp-bronze-edge",
        rank: "text-gp-bronze",
        name: "text-foreground text-[17px]",
        points: "text-foreground text-[21px]",
      };
    default:
      return {
        container: "bg-surface border-[0.5px] border-border border-l-[4px] border-l-transparent",
        rank: "text-muted",
        name: "text-foreground text-[15px]",
        points: "text-foreground text-lg",
      };
  }
}

function LeaderboardRowCard({
  row,
  movement,
}: {
  row: LeaderboardRow;
  movement: StandingMovement | undefined;
}) {
  const style = rankStyle(row.rank);
  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 sm:gap-4 ${style.container}`}>
      <span className={`flex shrink-0 items-baseline justify-end gap-0.5 ${style.rank}`}>
        <span className="w-6 text-right font-bold">{row.rank}</span>
        <MovementIndicator movement={movement} />
      </span>
      <div className="min-w-0 flex-1">
        <Link
          href={`/gp/runners/${row.runnerSlug}`}
          className={`block truncate font-semibold hover:underline ${style.name}`}
        >
          {row.runnerName}
        </Link>
        <p className="mt-0.5 text-xs text-muted">
          {row.raceEventsCounted} of {row.raceEventsEntered} races
          {row.volunteerPoints > 0 ? (
            <span className="text-primary"> · +{row.volunteerPoints} volunteer</span>
          ) : (
            <span className="text-gp-dim"> · —</span>
          )}
        </p>
      </div>
      <span className={`shrink-0 font-mono font-bold ${style.points}`}>{row.totalPoints}</span>
    </div>
  );
}

export function GpLeaderboard({
  rows,
  movements,
}: {
  rows: LeaderboardRow[];
  movements: Record<string, StandingMovement>;
}) {
  const [category, setCategory] = useState<CategoryFilter>("ALL");

  const categories: ("M" | "F")[] = category === "ALL" ? ["F", "M"] : [category];

  const sections = categories.map((c) => ({
    category: c,
    rows: rows.filter((r) => r.category === c),
  }));

  const hasAnyRows = sections.some((s) => s.rows.length > 0);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-foreground">Club Grand Prix Leaderboard</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/gp/events"
            className="rounded-lg border-[0.5px] border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
          >
            All events
          </Link>
          <ToggleGroup label="Category" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        </div>
      </div>
      <p className="mt-1 text-sm text-muted">
        Best 8 race scores count at full value; every race beyond that still earns 1 participation point. Volunteer
        credits are added on top, uncapped.
      </p>

      {!hasAnyRows ? (
        <p className="mt-10 rounded-xl border border-border bg-surface p-6 text-center text-muted">
          No Club Grand Prix results yet.
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {sections.map(
            (section) =>
              section.rows.length > 0 && (
                <div key={section.category}>
                  {category === "ALL" && (
                    <h3 className="mb-3 text-sm font-semibold text-primary">
                      {CATEGORY_SECTION_LABEL[section.category]}
                    </h3>
                  )}
                  <div className="flex flex-col gap-2">
                    {section.rows.map((row) => (
                      <LeaderboardRowCard
                        key={row.runnerId}
                        row={row}
                        movement={movements[`${row.runnerSlug}:${row.category}`]}
                      />
                    ))}
                  </div>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}

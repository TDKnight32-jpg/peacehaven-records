"use client";

import { useState } from "react";
import Link from "next/link";
import type { ScoringTypeBoard, ScoringTypeRow } from "@/lib/gp";
import { ToggleGroup } from "./toggle-group";
import { SCORING_BADGE, SCORING_LABEL } from "./gp-event-table";
import { CATEGORY_OPTIONS, CATEGORY_SECTION_LABEL, rankStyle, type CategoryFilter } from "./gp-leaderboard";

const SCORING_DESCRIPTION: Record<string, string> = {
  FASTEST_TIME: "Races scored on finishing time.",
  AGE_GRADE: "Races scored on age-graded percentage.",
  NAKED_RUN: "Races scored on how close runners get to their predicted time.",
};

/** Rows shown before the "Show all" button — keeps the page short on a
 * phone, where all six tables stack. */
const INITIAL_ROWS = 10;

function MiniTable({ title, rows }: { title: string; rows: ScoringTypeRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? rows : rows.slice(0, INITIAL_ROWS);

  return (
    <div className="min-w-0">
      <h4 className="mb-2 text-sm font-semibold text-primary">{title}</h4>
      {rows.length === 0 ? (
        <p className="rounded-xl border-[0.5px] border-border bg-surface px-4 py-3 text-sm text-muted">No results yet.</p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {visible.map((row) => {
            const style = rankStyle(row.rank);
            return (
              <div key={row.runnerSlug} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${style.container}`}>
                <span className={`w-6 shrink-0 text-right text-sm font-bold ${style.rank}`}>{row.rank}</span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/gp/runners/${row.runnerSlug}`}
                    className="block truncate text-sm font-semibold text-foreground hover:underline"
                  >
                    {row.runnerName}
                  </Link>
                  <p className="text-xs text-muted">
                    {row.races} race{row.races === 1 ? "" : "s"}
                  </p>
                </div>
                <span className="shrink-0 font-mono text-base font-bold text-foreground">{row.points}</span>
              </div>
            );
          })}
          {rows.length > INITIAL_ROWS && (
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="mt-1 self-start rounded-lg border-[0.5px] border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/50"
            >
              {expanded ? "Show top 10" : `Show all ${rows.length}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The "Category breakdown" page: one mini-leaderboard per scoring type,
 * women's and men's side by side (stacked on a phone), with the same
 * All/Women's/Men's filter as the homepage. See getScoringTypeBoards() for
 * how each table is scored.
 */
export function GpBreakdown({ boards }: { boards: ScoringTypeBoard[] }) {
  const [category, setCategory] = useState<CategoryFilter>("ALL");
  const categories: ("F" | "M")[] = category === "ALL" ? ["F", "M"] : [category];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Link href="/gp" className="text-sm font-medium text-muted hover:text-primary">
        ← Club Grand Prix
      </Link>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold text-foreground">Category breakdown</h2>
        <ToggleGroup label="Category" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
      </div>
      <p className="mt-1 text-sm text-muted">
        Points from each type of race, added up separately. Volunteer credits aren&apos;t included here — they
        still count on the main leaderboard.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {boards.map((board) => (
          <section key={board.scoringType}>
            <div className="flex flex-wrap items-center gap-2">
              <h3
                className={`rounded-full px-3 py-1 text-sm font-semibold ${SCORING_BADGE[board.scoringType] ?? "bg-border text-muted"}`}
              >
                {SCORING_LABEL[board.scoringType] ?? board.scoringType}
              </h3>
              <span className="text-xs text-muted">
                {board.racesRun} of {board.racesTotal} race{board.racesTotal === 1 ? "" : "s"} so far
              </span>
            </div>
            <p className="mt-1.5 text-sm text-muted">{SCORING_DESCRIPTION[board.scoringType]}</p>
            <div className={`mt-4 grid gap-6 ${categories.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {categories.map((c) => (
                <MiniTable
                  key={c}
                  title={CATEGORY_SECTION_LABEL[c]}
                  rows={board.rows.filter((r) => r.category === c)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

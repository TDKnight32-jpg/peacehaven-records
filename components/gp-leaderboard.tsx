"use client";

import { useState } from "react";
import Link from "next/link";
import type { LeaderboardRow } from "@/lib/gp";
import { ToggleGroup } from "./toggle-group";

type CategoryFilter = "ALL" | "M" | "F";

const CATEGORY_OPTIONS = [
  { value: "ALL" as CategoryFilter, label: "All" },
  { value: "F" as CategoryFilter, label: "Women's" },
  { value: "M" as CategoryFilter, label: "Men's" },
];

const CATEGORY_SECTION_LABEL: Record<"M" | "F", string> = { F: "Women's", M: "Men's" };

export function GpLeaderboard({ rows }: { rows: LeaderboardRow[] }) {
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
        <ToggleGroup label="Category" options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
      </div>
      <p className="mt-1 text-sm text-muted">
        Best 8 race scores count, out of however many races you&apos;ve entered — volunteer credits are added on top,
        uncapped.
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
                  <div className="overflow-hidden rounded-xl border border-border bg-surface">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                          <th className="px-4 py-2 font-semibold">#</th>
                          <th className="px-4 py-2 font-semibold">Runner</th>
                          <th className="px-4 py-2 font-semibold">Races</th>
                          <th className="px-4 py-2 text-right font-semibold">Vol. bonus</th>
                          <th className="px-4 py-2 text-right font-semibold">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.rows.map((row, i) => (
                          <tr key={row.runnerId} className="border-b border-border last:border-0">
                            <td className="px-4 py-2 text-muted">{i + 1}</td>
                            <td className="px-4 py-2">
                              <Link
                                href={`/gp/runners/${row.runnerSlug}`}
                                className="font-medium text-foreground hover:text-primary"
                              >
                                {row.runnerName}
                              </Link>
                            </td>
                            <td className="px-4 py-2 text-muted">
                              {row.raceEventsCounted} of {row.raceEventsEntered}
                            </td>
                            <td className="px-4 py-2 text-right font-mono text-muted">
                              {row.volunteerPoints > 0 ? `+${row.volunteerPoints}` : "—"}
                            </td>
                            <td className="px-4 py-2 text-right font-mono font-semibold text-primary">
                              {row.totalPoints}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ),
          )}
        </div>
      )}
    </div>
  );
}

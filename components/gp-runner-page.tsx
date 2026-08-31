import Link from "next/link";
import type { ClientGpResult, LeaderboardRow } from "@/lib/gp";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const CATEGORY_LABEL: Record<"M" | "F", string> = { F: "Women's", M: "Men's" };

/** Column widths (px) shared verbatim between the header row and every data
 * row via this single constant — not Tailwind width classes — so there is
 * no possibility of the two drifting out of sync. */
const COL = { date: 112, result: 96, pos: 32, points: 56 } as const;

/** Strong/mid/weak read on a single counting race's points — a distinct
 * green from the volunteer-bonus accent so the two signals don't blur
 * together. Dropped races and volunteer credits never get tiered: dropped
 * rows are already muted via opacity, and a volunteer credit's flat 1pt
 * isn't a performance score to grade. */
function pointsTierClass(points: number): string {
  if (points >= 15) return "text-gp-points-strong";
  if (points >= 9) return "text-gp-points-mid";
  return "text-gp-points-weak";
}

export function GpRunnerPage({
  runnerName,
  results,
  leaderboardByCategory,
}: {
  runnerName: string;
  results: (ClientGpResult & { eventSlug: string; eventName: string; eventDate: string })[];
  leaderboardByCategory: Record<"M" | "F", LeaderboardRow | null>;
}) {
  const countedEventSlugs = new Set(
    [leaderboardByCategory.F, leaderboardByCategory.M]
      .filter((row): row is LeaderboardRow => row !== null)
      .flatMap((row) => row.scores.filter((s) => s.counted).map((s) => s.eventSlug)),
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Link href="/gp" className="text-sm font-medium text-muted hover:text-primary">
        ← Club Grand Prix
      </Link>
      <h2 className="mt-2 text-xl font-bold text-foreground">{runnerName}</h2>

      <div className="mt-4 flex flex-wrap gap-3">
        {(["F", "M"] as const).map((cat) => {
          const row = leaderboardByCategory[cat];
          if (!row) return null;
          return (
            <div key={cat} className="rounded-xl border-[0.5px] border-primary/20 bg-primary-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {CATEGORY_LABEL[cat]} total
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-foreground">
                {row.totalPoints} <span className="text-sm font-normal text-muted">pts</span>
              </p>
              <p className="text-xs text-muted">
                {row.racePoints} race pts (best {row.raceEventsCounted} of {row.raceEventsEntered})
                {row.volunteerEvents > 0 && (
                  <>
                    {" "}
                    + {row.volunteerPoints} volunteer bonus ({row.volunteerEvents})
                  </>
                )}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 overflow-x-auto">
        <div className="min-w-[38rem]">
          <div className="flex items-center gap-3 px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
            <span className="flex-1">Event</span>
            <span style={{ width: COL.date, flexShrink: 0 }} className="text-right">
              Date
            </span>
            <span style={{ width: COL.result, flexShrink: 0 }} className="text-right">
              Result
            </span>
            <span style={{ width: COL.pos, flexShrink: 0 }} className="text-right">
              Pos
            </span>
            <span style={{ width: COL.points, flexShrink: 0 }} className="text-right">
              Points
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {results.map((r) => {
              const isDropped = r.points !== null && !countedEventSlugs.has(r.eventSlug);
              const isTiered = !isDropped && !r.isVolunteer && r.points !== null;
              return (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 rounded-xl border-[0.5px] border-border bg-surface px-4 py-3 ${
                    isDropped ? "opacity-55" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/gp/${r.eventSlug}`}
                      className="truncate font-medium text-foreground hover:text-primary"
                    >
                      {r.eventName}
                    </Link>
                    {r.isVolunteer && (
                      <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">
                        Volunteer
                      </span>
                    )}
                  </div>
                  <span style={{ width: COL.date, flexShrink: 0 }} className="text-right text-sm text-muted">
                    {formatDate(r.eventDate)}
                  </span>
                  <span
                    style={{ width: COL.result, flexShrink: 0 }}
                    className="text-right font-mono text-sm text-foreground"
                  >
                    {r.result ?? "—"}
                  </span>
                  <span
                    style={{ width: COL.pos, flexShrink: 0 }}
                    className="text-right text-xs font-medium text-muted"
                  >
                    {r.position ?? "—"}
                  </span>
                  <span
                    style={{ width: COL.points, flexShrink: 0 }}
                    className={`text-right font-mono text-lg font-bold ${
                      isTiered ? pointsTierClass(r.points!) : "text-foreground"
                    }`}
                  >
                    {r.points ?? "—"}
                    {isDropped && (
                      <span className="block text-[10px] font-normal text-muted" title="Not in the best-8 count">
                        dropped
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

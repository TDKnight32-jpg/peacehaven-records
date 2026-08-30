import Link from "next/link";
import type { ClientGpResult, LeaderboardRow } from "@/lib/gp";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

const CATEGORY_LABEL: Record<"M" | "F", string> = { F: "Women's", M: "Men's" };

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
            <div key={cat} className="rounded-xl border border-border bg-surface px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                {CATEGORY_LABEL[cat]} total
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-primary">
                {row.totalPoints} <span className="text-sm font-normal text-muted">pts</span>
              </p>
              <p className="text-xs text-muted">
                best {row.eventsCounted} of {row.eventsEntered} events
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-surface">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-2 font-semibold">Event</th>
              <th className="px-4 py-2 font-semibold">Date</th>
              <th className="px-4 py-2 font-semibold">Result</th>
              <th className="px-4 py-2 font-semibold">Pos</th>
              <th className="px-4 py-2 text-right font-semibold">Points</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2">
                  <Link href={`/gp/${r.eventSlug}`} className="font-medium text-foreground hover:text-primary">
                    {r.eventName}
                  </Link>
                  {r.isVolunteer && (
                    <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">
                      Volunteer
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-muted">{formatDate(r.eventDate)}</td>
                <td className="px-4 py-2 font-mono text-foreground">{r.result ?? "—"}</td>
                <td className="px-4 py-2 text-muted">{r.position ?? "—"}</td>
                <td className="px-4 py-2 text-right font-mono font-semibold">
                  {r.points ?? "—"}
                  {r.points !== null && !countedEventSlugs.has(r.eventSlug) && (
                    <span className="ml-1 text-xs font-normal text-muted" title="Not in the best-8 count">
                      (dropped)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

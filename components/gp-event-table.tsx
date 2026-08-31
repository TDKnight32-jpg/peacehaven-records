import Link from "next/link";
import type { ClientGpEvent, ClientGpResult } from "@/lib/gp";

export const SCORING_LABEL: Record<string, string> = {
  FASTEST_TIME: "Fastest Time",
  AGE_GRADE: "Age Grade",
  NAKED_RUN: "Naked Run",
};

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

type MedalTier = 1 | 2 | 3 | null;

const MEDAL_CONTAINER: Record<Exclude<MedalTier, null>, string> = {
  1: "bg-gp-row-gold border-l-[4px] border-l-gp-gold-edge",
  2: "bg-gp-row-silver border-l-[4px] border-l-gp-silver-edge",
  3: "bg-gp-row-bronze border-l-[4px] border-l-gp-bronze-edge",
};

const MEDAL_POINTS_SIZE: Record<Exclude<MedalTier, null>, string> = {
  1: "text-[26px]",
  2: "text-[23px]",
  3: "text-[21px]",
};

/** Top 3 is by Points (the club's scoring stat), not by the POS column
 * (raw race finishing position) — those two orderings can differ once
 * age-grading or DNFs are involved. Volunteer credits are excluded, same as
 * the leaderboard: they don't compete for a race placing. */
function pointsMedalByResultId(results: ClientGpResult[]): Map<string, MedalTier> {
  const ranked = results
    .filter((r) => !r.isVolunteer && r.points !== null)
    .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const medals = new Map<string, MedalTier>();
  ranked.slice(0, 3).forEach((r, i) => medals.set(r.id, (i + 1) as MedalTier));
  return medals;
}

function ResultsTable({ results }: { results: ClientGpResult[] }) {
  if (results.length === 0) {
    return <p className="mt-3 text-sm text-muted">No results recorded for this event.</p>;
  }

  const medals = pointsMedalByResultId(results);

  return (
    <div className="mt-3 overflow-x-auto">
      <div className="min-w-[42rem]">
        <div className="flex items-center gap-3 px-4 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <span className="w-8 shrink-0">Pos</span>
          <span className="flex-1">Runner</span>
          <span className="w-24 shrink-0 text-right">Result</span>
          <span className="w-24 shrink-0 text-right">Raw time</span>
          <span className="w-24 shrink-0 text-right">Predicted</span>
          <span className="w-14 shrink-0 text-right">Points</span>
        </div>
        <div className="flex flex-col gap-2">
          {results.map((r) => {
            const tier = medals.get(r.id) ?? null;
            return (
              <div
                key={r.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  tier
                    ? MEDAL_CONTAINER[tier]
                    : "bg-surface border-[0.5px] border-border border-l-[4px] border-l-transparent"
                }`}
              >
                <span className="w-8 shrink-0 text-xs font-medium text-muted">{r.position ?? "—"}</span>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/gp/runners/${r.runnerSlug}`}
                    className="truncate font-medium text-foreground hover:text-primary"
                  >
                    {r.runnerName}
                  </Link>
                  {r.isVolunteer && (
                    <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">
                      Volunteer
                    </span>
                  )}
                </div>
                <span className="w-24 shrink-0 text-right font-mono text-sm text-foreground">
                  {r.result ?? "—"}
                </span>
                <span className="w-24 shrink-0 text-right font-mono text-sm text-muted">{r.rawTime ?? "—"}</span>
                <span className="w-24 shrink-0 text-right font-mono text-sm text-muted">
                  {r.predictedTime ?? "—"}
                </span>
                <span
                  className={`w-14 shrink-0 text-right font-mono font-bold text-foreground ${
                    tier ? MEDAL_POINTS_SIZE[tier] : "text-lg"
                  }`}
                >
                  {r.points ?? "—"}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function GpEventPage({ event, results }: { event: ClientGpEvent; results: ClientGpResult[] }) {
  const women = results.filter((r) => r.category === "F");
  const men = results.filter((r) => r.category === "M");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Link href="/gp" className="text-sm font-medium text-muted hover:text-primary">
        ← Club Grand Prix
      </Link>
      <h2 className="mt-2 text-xl font-bold text-foreground">{event.name}</h2>
      <p className="mt-1 flex flex-wrap gap-x-2 text-sm text-muted">
        <span>{formatDate(event.date)}</span>
        {event.distanceName && <span>· {event.distanceName}</span>}
        <span>· {SCORING_LABEL[event.scoringType] ?? event.scoringType}</span>
        {event.isSussexGp && <span className="font-medium text-secondary">· Sussex GP</span>}
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <div>
          <h3 className="text-sm font-semibold text-primary">Women&apos;s</h3>
          <ResultsTable results={women} />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-primary">Men&apos;s</h3>
          <ResultsTable results={men} />
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import type { ClientGpEvent, ClientGpResult } from "@/lib/gp";

const SCORING_LABEL: Record<string, string> = {
  FASTEST_TIME: "Fastest Time",
  AGE_GRADE: "Age Grade",
  NAKED_RUN: "Naked Run",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ResultsTable({ results }: { results: ClientGpResult[] }) {
  if (results.length === 0) {
    return <p className="mt-3 text-sm text-muted">No results recorded for this event.</p>;
  }
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
            <th className="px-4 py-2 font-semibold">Pos</th>
            <th className="px-4 py-2 font-semibold">Runner</th>
            <th className="px-4 py-2 font-semibold">Result</th>
            <th className="px-4 py-2 font-semibold">Raw time</th>
            <th className="px-4 py-2 font-semibold">Predicted</th>
            <th className="px-4 py-2 text-right font-semibold">Points</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="px-4 py-2 text-muted">{r.position ?? "—"}</td>
              <td className="px-4 py-2">
                <Link href={`/gp/runners/${r.runnerSlug}`} className="font-medium text-foreground hover:text-primary">
                  {r.runnerName}
                </Link>
                {r.isVolunteer && (
                  <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">
                    Volunteer
                  </span>
                )}
              </td>
              <td className="px-4 py-2 font-mono text-foreground">{r.result ?? "—"}</td>
              <td className="px-4 py-2 font-mono text-muted">{r.rawTime ?? "—"}</td>
              <td className="px-4 py-2 font-mono text-muted">{r.predictedTime ?? "—"}</td>
              <td className="px-4 py-2 text-right font-mono font-semibold text-primary">{r.points ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

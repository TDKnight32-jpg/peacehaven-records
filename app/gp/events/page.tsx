import Link from "next/link";
import { getGpEvents } from "@/lib/gp";
import { SCORING_LABEL, formatDate } from "@/components/gp-event-table";

// Same shape as the leaderboard's rows: styling to match the individual
// event page comes once that's signed off.
export const revalidate = 0;

const SCORING_BADGE: Record<string, string> = {
  FASTEST_TIME: "bg-primary-50 text-primary",
  AGE_GRADE: "bg-gp-blue-bg text-gp-blue",
  NAKED_RUN: "bg-gp-plum-bg text-gp-plum",
};

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{children}</span>;
}

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
    >
      <path d="M7.5 4.5L13 10l-5.5 5.5" />
    </svg>
  );
}

export default async function GpEventsPage() {
  const events = await getGpEvents();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <Link href="/gp" className="text-sm font-medium text-muted hover:text-primary">
        ← Club Grand Prix
      </Link>
      <h2 className="mt-2 text-lg font-bold text-foreground">Events</h2>

      <ul className="mt-6 flex flex-col gap-2">
        {events.map((e) => (
          <li key={e.id}>
            <Link
              href={`/gp/${e.slug}`}
              className="group flex items-center justify-between gap-4 rounded-xl border-[0.5px] border-border bg-surface px-4 py-3 transition-colors hover:border-primary/50 hover:bg-primary-50/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className={`font-medium ${e.isUpcoming ? "text-muted" : "text-foreground"}`}>{e.name}</p>
                  {e.isUpcoming && <Badge className="bg-border text-muted">Upcoming</Badge>}
                  {e.isSussexGp && <Badge className="bg-gp-row-gold text-gp-gold">Sussex GP</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-muted">
                  {formatDate(e.date)}
                  {e.distanceName && ` · ${e.distanceName}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Badge className={SCORING_BADGE[e.scoringType] ?? "bg-border text-muted"}>
                  {SCORING_LABEL[e.scoringType] ?? e.scoringType}
                </Badge>
                <ChevronIcon />
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

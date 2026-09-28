import Link from "next/link";
import type { ClientGpEvent } from "@/lib/gp";
import { SCORING_LABEL } from "./gp-event-table";

const TIME_ZONE = "Europe/London";

/** Calendar date (YYYY-MM-DD) as it is in the UK, so "today"/"tomorrow"
 * flip at UK midnight rather than the server's clock. */
function ukDay(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
}

/** "in 19 days" / "tomorrow" / "today" — or "Results coming soon" once
 * race day has passed but its results haven't been imported yet. */
export function countdownLabel(eventIso: string, now: Date): string {
  const days = Math.round((Date.parse(ukDay(new Date(eventIso))) - Date.parse(ukDay(now))) / 86_400_000);
  if (days < 0) return "Results coming soon";
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

/** "Saturday 17 October", plus the year only when it's not this year. */
function longDate(eventIso: string, now: Date): string {
  const date = new Date(eventIso);
  const sameYear =
    date.toLocaleDateString("en-GB", { timeZone: TIME_ZONE, year: "numeric" }) ===
    now.toLocaleDateString("en-GB", { timeZone: TIME_ZONE, year: "numeric" });
  return date.toLocaleDateString("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/**
 * "Next race" banner for the GP homepage — see getNextGpEvent() for which
 * event it picks. Renders nothing when there's no upcoming event. Gold left
 * edge matches the leaderboard's 1st-place card; the whole card links to
 * the event's page.
 */
export function GpNextRace({ event }: { event: ClientGpEvent | null }) {
  if (!event) return null;
  const now = new Date();
  const details = [longDate(event.date, now), event.distanceName, SCORING_LABEL[event.scoringType] ?? event.scoringType]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
      <Link
        href={`/gp/${event.slug}`}
        className="flex flex-col gap-1 rounded-xl border-[0.5px] border-l-[4px] border-border border-l-gp-gold-edge bg-surface px-4 py-3 transition-colors hover:bg-primary-50/40 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gp-gold">Next race</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-2">
            <p className="font-semibold text-foreground">{event.name}</p>
            {event.isSussexGp && (
              <span className="shrink-0 rounded-full bg-gp-row-gold px-2 py-0.5 text-[11px] font-medium text-gp-gold">
                Sussex GP
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">{details}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-primary">{countdownLabel(event.date, now)}</span>
      </Link>
    </div>
  );
}

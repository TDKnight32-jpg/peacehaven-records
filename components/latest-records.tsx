import type { LatestRecord } from "@/lib/record-highlights";

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

/** A slim row of the most recent records approved through the site. Renders
 * nothing when there are none, rather than an empty box. */
export function LatestRecords({ records }: { records: LatestRecord[] }) {
  if (records.length === 0) return null;

  return (
    <section
      aria-labelledby="latest-records-heading"
      className="flex flex-col gap-1.5 rounded-lg border border-border border-l-4 border-l-gp-gold-edge bg-surface px-3 py-2 text-xs sm:flex-row sm:items-baseline sm:gap-3"
    >
      <h2 id="latest-records-heading" className="shrink-0 font-semibold uppercase tracking-wide text-gp-gold">
        Latest records
      </h2>
      <ul className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
        {records.map((r) => (
          <li key={r.id} className="text-muted">
            <span className="font-semibold text-primary">{r.headline}:</span>{" "}
            <span className="text-foreground">{r.athleteName}</span>, <span className="font-mono">{r.performance}</span> ·{" "}
            <time dateTime={r.decidedAt}>{dateFormat.format(new Date(r.decidedAt))}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}

import Link from "next/link";
import clsx from "clsx";
import { placeLabel } from "@/lib/record-ranking";
import type { ProfileHistoryEntry, ProfilePlace, RunnerProfile } from "@/lib/runner-profiles";

// Dates are formatted here, on the server only (this isn't a client
// component), so there's no server/browser mismatch.
const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const formatDate = (iso: string | null) => (iso ? dateFormat.format(new Date(iso)) : null);

/** The same medal tints as the records page (gp-gold/silver/bronze). */
const MEDAL: Record<number, { row: string; text: string }> = {
  1: { row: "bg-gp-row-gold border-l-gp-gold-edge", text: "text-gp-gold" },
  2: { row: "bg-gp-row-silver border-l-gp-silver-edge", text: "text-gp-silver" },
  3: { row: "bg-gp-row-bronze border-l-gp-bronze-edge", text: "text-gp-bronze" },
};

function summary(places: ProfilePlace[], history: ProfileHistoryEntry[]): string {
  const records = places.filter((p) => p.place === 1).length;
  const parts = [
    places.length > 0
      ? `${places.length} current top-3 place${places.length === 1 ? "" : "s"}`
      : "No current top-3 places",
  ];
  if (records > 0) parts.push(`holds ${records} record${records === 1 ? "" : "s"}`);
  else if (history.length > 0) parts.push("former record holder");
  return parts.join(" · ");
}

function PlaceCard({ p }: { p: ProfilePlace }) {
  const medal = MEDAL[p.place] ?? MEDAL[3];
  return (
    <li className={clsx("flex flex-col gap-1 rounded-lg border-l-[4px] px-4 py-3", medal.row)}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{p.distanceName}</p>
          <p className="text-xs text-muted">
            {p.gender} {p.list}
          </p>
        </div>
        <span className={clsx("shrink-0 text-sm font-bold", medal.text)}>{placeLabel(p.place, p.joint)}</span>
      </div>
      <p className="font-mono text-lg font-semibold text-primary">{p.performance}</p>
      <p className="text-xs text-muted">
        {[p.event, formatDate(p.date)].filter(Boolean).join(" · ")}
        {p.footnote && <span className="block">* {p.footnote}</span>}
      </p>
      {p.cardUrl && (
        <a
          href={p.cardUrl}
          target="_blank"
          rel="noopener"
          className="mt-1 self-start text-xs font-semibold text-primary underline underline-offset-2 hover:text-secondary"
        >
          Share card ↗
        </a>
      )}
    </li>
  );
}

function HistoryItem({ h }: { h: ProfileHistoryEntry }) {
  return (
    <li className="relative">
      <span
        className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface"
        style={{ backgroundColor: h.current ? "var(--color-secondary)" : "var(--color-border)" }}
        aria-hidden
      />
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium text-foreground">
          {h.distanceName} <span className="font-normal text-muted">· {h.gender} {h.list}</span>
        </span>
        <span className="shrink-0 font-mono text-sm font-semibold text-primary">{h.performance}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-1 text-xs text-muted">
        <span className={clsx("font-semibold", h.current ? "text-secondary" : "text-muted")}>
          {h.current ? (h.joint ? "Joint current record" : "Current record") : "Former record"} ·
        </span>
        {h.equalled && <span className="font-semibold text-gp-gold">Equalled ·</span>}
        <span>{[h.event, formatDate(h.date)].filter(Boolean).join(" · ")}</span>
      </div>
    </li>
  );
}

/** A runner's profile: their current top-3 places on the club records, and
 * the club records they've held (from the record history). */
export function RunnerProfileView({ profile }: { profile: RunnerProfile }) {
  const { names, places, history } = profile;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <Link href="/" className="text-sm font-medium text-muted hover:text-primary">
        ← Back to club records
      </Link>

      <header className="mt-4 rounded-xl border border-border border-t-4 border-t-gp-gold-edge bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Runner profile</p>
        <h2 className="mt-1 text-2xl font-bold text-foreground">{names.join(" / ")}</h2>
        <p className="mt-1 text-sm text-muted">{summary(places, history)}</p>
      </header>

      <section aria-labelledby="places-heading" className="mt-8">
        <h3 id="places-heading" className="text-xs font-semibold uppercase tracking-wide text-gp-gold">
          Current top-3 places
        </h3>
        {places.length === 0 ? (
          <p className="mt-2 rounded-xl border border-border bg-surface p-4 text-sm text-muted">
            Not in a top 3 at the moment.
          </p>
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {places.map((p, i) => (
              <PlaceCard key={i} p={p} />
            ))}
          </ul>
        )}
      </section>

      {history.length > 0 && (
        <section aria-labelledby="history-heading" className="mt-8 rounded-xl border border-border bg-surface p-5">
          <h3 id="history-heading" className="text-sm font-semibold text-primary">
            Record history
          </h3>
          <p className="mt-0.5 text-xs text-muted">Club records they&rsquo;ve set or equalled, newest first.</p>
          <ol className="mt-3 flex flex-col gap-3 border-l-2 border-border pl-4">
            {history.map((h, i) => (
              <HistoryItem key={i} h={h} />
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

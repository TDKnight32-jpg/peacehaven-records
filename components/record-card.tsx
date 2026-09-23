import type { ClientRecord } from "@/lib/records";

const RANK_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function RecordCard({
  title,
  entries,
  unit,
  footnoteAnchor,
}: {
  title: string;
  entries: ClientRecord[];
  unit: "time" | "laps";
  /** Maps footnote text to the id of its entry in the legend below the table. */
  footnoteAnchor?: (footnote: string) => string;
}) {
  const filled = entries.filter((e) => e.name);

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {filled.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No record set</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {filled.map((e) => (
            <li key={e.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-foreground">{e.name}</span>
                <span className="font-mono text-sm font-semibold text-primary">
                  {unit === "laps" ? `${e.laps} lap${e.laps === 1 ? "" : "s"}` : e.time}
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1 text-xs text-muted">
                {filled.length > 1 && (
                  <span className="font-semibold text-secondary">{RANK_LABEL[e.rank] ?? `${e.rank}th`}</span>
                )}
                {e.event && (
                  <span>
                    {filled.length > 1 && "· "}
                    {e.event}
                    {e.footnote && footnoteAnchor && (
                      <a
                        href={`#${footnoteAnchor(e.footnote)}`}
                        title={e.footnote}
                        aria-label={`Footnote: ${e.footnote}`}
                        className="ml-0.5 font-semibold text-secondary no-underline hover:underline"
                      >
                        {e.footnoteSymbol ?? "*"}
                      </a>
                    )}
                  </span>
                )}
                {e.date && <span>· {formatDate(e.date)}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

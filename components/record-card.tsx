import type { ClientRecord } from "@/lib/records";

const RANK_LABEL: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface PodiumStyle {
  container: string;
  rank: string;
  name: string;
  time: string;
}

/** Medal tints shared with the GP leaderboard, with name/time sizes tapering
 * down from 1st. Stacked (narrow card) they read like leaderboard rows, with
 * a left edge; once the card is wide enough for a podium they sit side by
 * side in 2nd–1st–3rd order, the edge moves to the top, and the taller
 * padding on 1st/2nd raises them above 3rd since the row aligns bottoms.
 * DOM order stays 1st–2nd–3rd so the stacked view and screen readers get
 * the natural ranking; only `order` rearranges the podium. */
function podiumStyle(rank: number): PodiumStyle {
  switch (rank) {
    case 1:
      return {
        container:
          "bg-gp-row-gold border-l-gp-gold-edge @sm:order-2 @sm:border-t-gp-gold-edge @sm:pt-8 @sm:shadow-md",
        rank: "text-gp-gold",
        name: "text-[17px] @sm:text-[18px]",
        time: "text-[18px] @sm:text-[22px]",
      };
    case 2:
      return {
        container: "bg-gp-row-silver border-l-gp-silver-edge @sm:order-1 @sm:border-t-gp-silver-edge @sm:pt-5",
        rank: "text-gp-silver",
        name: "text-[16px]",
        time: "text-[16px] @sm:text-[18px]",
      };
    default:
      return {
        container: "bg-gp-row-bronze border-l-gp-bronze-edge @sm:order-3 @sm:border-t-gp-bronze-edge",
        rank: "text-gp-bronze",
        name: "text-[15px]",
        time: "text-[15px] @sm:text-[16px]",
      };
  }
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
  const isPodium = filled.length > 1 && filled.every((e) => e.rank <= 3);

  const performance = (e: ClientRecord) => (unit === "laps" ? `${e.laps} lap${e.laps === 1 ? "" : "s"}` : e.time);

  // In a podium column the event and date sit on separate lines, so the
  // "·" before the date is only shown while the podium is stacked.
  const details = (e: ClientRecord, podium: boolean) => (
    <>
      {e.event && (
        <span>
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
      {e.date && (
        <span>
          <span className={podium ? "@sm:hidden" : undefined}>· </span>
          {formatDate(e.date)}
        </span>
      )}
    </>
  );

  return (
    <div className="@container rounded-xl border border-border bg-surface p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
      {filled.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No record set</p>
      ) : isPodium ? (
        <ol className="mt-3 flex flex-col gap-2 @sm:grid @sm:grid-cols-3 @sm:items-end">
          {filled.map((e) => {
            const style = podiumStyle(e.rank);
            return (
              <li
                key={e.id}
                className={`flex flex-col gap-0.5 rounded-lg border-l-[4px] px-3 py-2.5 @sm:items-center @sm:border-l-0 @sm:border-t-[4px] @sm:px-2 @sm:pb-3 @sm:text-center ${style.container}`}
              >
                <div className="flex items-baseline justify-between gap-2 @sm:flex-col @sm:items-center @sm:gap-0.5">
                  <span className={`font-medium text-foreground @sm:break-words ${style.name}`}>{e.name}</span>
                  <span className={`font-mono font-semibold text-primary ${style.time}`}>{performance(e)}</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1 text-xs text-muted @sm:flex-col @sm:items-center">
                  <span className={`font-semibold ${style.rank}`}>
                    {RANK_LABEL[e.rank]}
                    {e.event && <span className="@sm:hidden"> ·</span>}
                  </span>
                  {details(e, true)}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {filled.map((e) => (
            <li key={e.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-foreground">{e.name}</span>
                <span className="font-mono text-sm font-semibold text-primary">{performance(e)}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1 text-xs text-muted">
                {filled.length > 1 && (
                  <span className="font-semibold text-secondary">{RANK_LABEL[e.rank] ?? `${e.rank}th`}</span>
                )}
                {filled.length > 1 && e.event && "· "}
                {details(e, false)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

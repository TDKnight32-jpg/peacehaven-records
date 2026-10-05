import type { NewRecord } from "@/lib/record-highlights";
import { RecordCardThumb } from "./record-card-thumb";

/** The most recent records approved through the site, each as its share card
 * with a Share button over the corner. Renders nothing when there are none,
 * rather than an empty box. On phones the cards scroll sideways. */
export function LatestRecords({
  records,
  cardUrlBase = "/record-card",
}: {
  records: NewRecord[];
  /** Where cards are served from, by record ID. */
  cardUrlBase?: string;
}) {
  if (records.length === 0) return null;

  return (
    <section aria-labelledby="latest-records-heading">
      <h2 id="latest-records-heading" className="text-xs font-semibold uppercase tracking-wide text-gp-gold">
        Latest records
      </h2>
      {/* Bleeds to the screen edge on phones so the sideways scroll isn't
          cut off at the page gutter. */}
      <ul className="-mx-4 mt-2 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0">
        {records.map((r) => (
          <RecordCardItem key={r.id} record={r} cardUrl={`${cardUrlBase}/${r.id}`} />
        ))}
      </ul>
    </section>
  );
}

function RecordCardItem({ record, cardUrl }: { record: NewRecord; cardUrl: string }) {
  return (
    <li className="w-[200px] shrink-0 snap-start sm:w-[220px]">
      <RecordCardThumb record={record} cardUrl={cardUrl} />
      <p className="mt-1.5 truncate text-sm font-semibold text-foreground">{record.athleteName}</p>
      <p className="truncate text-xs text-muted">
        <span className="font-mono font-semibold text-primary">{record.performance}</span> · {record.listLabel}
      </p>
    </li>
  );
}

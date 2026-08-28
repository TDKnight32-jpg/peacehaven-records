import type { ClientHistoryEntry } from "@/lib/records";

const GENDER_LABEL: Record<"F" | "M", string> = { F: "Women's", M: "Men's" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function GenderProgression({ gender, entries }: { gender: "F" | "M"; entries: ClientHistoryEntry[] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">
        {GENDER_LABEL[gender]}
      </h4>
      <ol className="mt-2 flex flex-col gap-3 border-l-2 border-border pl-4">
        {entries.map((e, i) => {
          const isCurrent = i === entries.length - 1;
          return (
            <li key={e.id} className="relative">
              <span
                className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface"
                style={{ backgroundColor: isCurrent ? "var(--color-secondary)" : "var(--color-border)" }}
                aria-hidden
              />
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-medium text-foreground">{e.name}</span>
                <span className="font-mono text-sm font-semibold text-primary">{e.time}</span>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-1 text-xs text-muted">
                {isCurrent && <span className="font-semibold text-secondary">Current record ·</span>}
                {e.event && <span>{e.event}</span>}
                {e.date && <span>· {formatDate(e.date)}</span>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function RecordHistoryPanel({
  entries,
  genders,
}: {
  entries: ClientHistoryEntry[];
  genders: ("F" | "M")[];
}) {
  const sections = genders
    .map((g) => ({ gender: g, entries: entries.filter((e) => e.gender === g).sort((a, b) => a.order - b.order) }))
    .filter((s) => s.entries.length > 0);

  if (sections.length === 0) return null;

  return (
    <details className="mt-8 rounded-xl border border-border bg-surface p-4 open:pb-5">
      <summary className="cursor-pointer select-none text-sm font-semibold text-primary">
        Record History
      </summary>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {sections.map((s) => (
          <GenderProgression key={s.gender} gender={s.gender} entries={s.entries} />
        ))}
      </div>
    </details>
  );
}

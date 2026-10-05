import { categoryRank } from "@/lib/distances";
import type { ClientHistoryEntry } from "@/lib/records";

const GENDER_LABEL: Record<"F" | "M", string> = { F: "Women's", M: "Men's" };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function performance(e: ClientHistoryEntry): string {
  return e.time ?? `${e.laps} laps`;
}

/** One list's progression of #1 holders, oldest first; the last is current. */
function Timeline({ entries }: { entries: ClientHistoryEntry[] }) {
  return (
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
              <span className="font-mono text-sm font-semibold text-primary">{performance(e)}</span>
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
  );
}

/** Age-group view: one collapsed row per category with history, the current
 * holder in its summary — a timeline for every band at once would be long. */
function CategoryRows({ entries }: { entries: ClientHistoryEntry[] }) {
  const byCategory = new Map<string, ClientHistoryEntry[]>();
  for (const e of entries) {
    if (!e.ageCategory) continue;
    if (!byCategory.has(e.ageCategory)) byCategory.set(e.ageCategory, []);
    byCategory.get(e.ageCategory)!.push(e);
  }
  const categories = [...byCategory.entries()].sort(([a], [b]) => categoryRank(a) - categoryRank(b));

  return (
    <div className="mt-2 flex flex-col gap-2">
      {categories.map(([category, list]) => {
        const current = list[list.length - 1];
        return (
          <details key={category} className="group rounded-lg border border-border bg-background px-3 py-2">
            <summary className="flex cursor-pointer select-none flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-semibold text-foreground">{category}</span>
              <span className="text-xs text-muted">
                {list.length} record{list.length === 1 ? "" : "s"}
              </span>
              <span className="ml-auto text-xs text-muted group-open:hidden">
                {current.name} · <span className="font-mono font-semibold text-primary">{performance(current)}</span>
              </span>
            </summary>
            <div className="pb-1 pt-1">
              <Timeline entries={list} />
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** Follows the page's Overall / Age Group toggle: the overall progression,
 * or the age-group lists for the selected distance. Hidden when the current
 * view has no history. */
export function RecordHistoryPanel({
  entries,
  genders,
  recordType,
}: {
  entries: ClientHistoryEntry[];
  genders: ("F" | "M")[];
  recordType: "AGE_GROUP" | "OVERALL";
}) {
  const sections = genders
    .map((g) => ({
      gender: g,
      entries: entries
        .filter((e) => e.gender === g && e.recordType === recordType)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((s) => s.entries.length > 0);

  if (sections.length === 0) return null;

  return (
    <details className="mt-8 rounded-xl border border-border bg-surface p-4 open:pb-5">
      <summary className="cursor-pointer select-none text-sm font-semibold text-primary">
        Record History{recordType === "AGE_GROUP" && <span className="font-normal text-muted"> · age groups</span>}
      </summary>
      <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {sections.map((s) => (
          <div key={s.gender}>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">{GENDER_LABEL[s.gender]}</h4>
            {recordType === "OVERALL" ? <Timeline entries={s.entries} /> : <CategoryRows entries={s.entries} />}
          </div>
        ))}
      </div>
    </details>
  );
}

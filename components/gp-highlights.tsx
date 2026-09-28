import { Fragment } from "react";
import Link from "next/link";
import type { CategoryHighlights } from "@/lib/gp-highlights";

const CATEGORY_LABEL = { F: "Women's", M: "Men's" } as const;

function HighlightCard({
  title,
  subtitle,
  titleClass,
  highlights,
  categories,
}: {
  title: string;
  subtitle: string;
  titleClass: string;
  highlights: CategoryHighlights;
  categories: ("F" | "M")[];
}) {
  const shown = categories.filter((c) => highlights[c]);
  if (shown.length === 0) return null;

  return (
    <div className="rounded-xl border-[0.5px] border-border bg-surface px-4 py-3">
      <p className={`text-[11px] font-bold uppercase tracking-widest ${titleClass}`}>{title}</p>
      <p className="text-xs text-muted">{subtitle}</p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {shown.map((c) => {
          const winner = highlights[c]!;
          return (
            <li key={c} className="flex items-baseline gap-2 text-sm">
              <span className="w-14 shrink-0 text-xs font-semibold text-muted">{CATEGORY_LABEL[c]}</span>
              <span className="min-w-0">
                {winner.runners.map((r, i) => (
                  <Fragment key={r.slug}>
                    {i > 0 && " & "}
                    <Link href={`/gp/runners/${r.slug}`} className="font-semibold text-foreground hover:underline">
                      {r.name}
                    </Link>
                  </Fragment>
                ))}
                <span className="text-xs text-muted"> · {winner.detail}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** "Most improved" and "Best newcomer" cards above the leaderboard table —
 * see lib/gp-highlights.ts for how each is decided. Side by side on wider
 * screens, stacked on a phone; follows the leaderboard's category filter.
 * A card with no winner in the visible categories is left out entirely. */
export function GpHighlights({
  mostImproved,
  bestNewcomer,
  categories,
}: {
  mostImproved: CategoryHighlights;
  bestNewcomer: CategoryHighlights;
  categories: ("F" | "M")[];
}) {
  const hasAny = categories.some((c) => mostImproved[c] || bestNewcomer[c]);
  if (!hasAny) return null;

  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <HighlightCard
        title="▲ Most improved"
        subtitle="Most places climbed since the last race"
        titleClass="text-gp-points-strong"
        highlights={mostImproved}
        categories={categories}
      />
      <HighlightCard
        title="★ Best newcomer"
        subtitle="Best average points per race, from 2–3 races"
        titleClass="text-gp-gold"
        highlights={bestNewcomer}
        categories={categories}
      />
    </div>
  );
}

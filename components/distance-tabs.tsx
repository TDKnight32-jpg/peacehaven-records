"use client";

import clsx from "clsx";
import type { DistanceMeta } from "@/lib/records";

export function DistanceTabs({
  distances,
  selected,
  onSelect,
}: {
  distances: DistanceMeta[];
  selected: string;
  onSelect: (slug: string) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Distance"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
    >
      {distances.map((d) => {
        const active = d.slug === selected;
        return (
          <button
            key={d.slug}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(d.slug)}
            className={clsx(
              "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-foreground hover:border-primary/50",
            )}
          >
            {d.name}
          </button>
        );
      })}
    </div>
  );
}

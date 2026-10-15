"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { matchRunners, type RunnerSuggestion } from "@/lib/runner-search";

/** "Find a runner": suggests athletes on the records as a name is typed
 * (see matchRunners) and opens the picked one's profile. Separate from the
 * lists' "Search name or event" filter, which only narrows what's shown. */
export function RunnerSearch({ runners, autoFocus = false }: { runners: RunnerSuggestion[]; autoFocus?: boolean }) {
  const router = useRouter();
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const matches = useMemo(() => matchRunners(query, runners), [query, runners]);
  const showList = open && query.trim() !== "";

  const go = (r: RunnerSuggestion) => {
    setOpen(false);
    router.push(`/runner/${r.slug}`);
  };

  return (
    <div className="relative w-full sm:max-w-sm">
      <label htmlFor={`${id}-input`} className="text-xs font-semibold uppercase tracking-wide text-secondary">
        Find a runner
      </label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        aria-activedescendant={showList && matches[active] ? `${id}-option-${active}` : undefined}
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder="Start typing a name…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && matches.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % matches.length);
          } else if (e.key === "ArrowUp" && matches.length) {
            e.preventDefault();
            setActive((a) => (a - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter" && showList && matches[active]) {
            e.preventDefault();
            go(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary"
      />
      {showList && (
        <ul
          id={`${id}-list`}
          role="listbox"
          aria-label="Matching runners"
          className="absolute inset-x-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted">No runners on the records match &ldquo;{query.trim()}&rdquo;.</li>
          ) : (
            matches.map((r, i) => (
              <li
                key={r.slug}
                id={`${id}-option-${i}`}
                role="option"
                aria-selected={i === active}
                // Keep focus in the box until the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => go(r)}
                onMouseEnter={() => setActive(i)}
                className={clsx(
                  "flex cursor-pointer items-baseline justify-between gap-3 px-3 py-2.5 text-sm",
                  i === active ? "bg-gp-row-gold" : "bg-surface",
                )}
              >
                <span className="font-medium text-foreground">{r.name}</span>
                <span className="shrink-0 text-xs text-muted">{r.summary}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

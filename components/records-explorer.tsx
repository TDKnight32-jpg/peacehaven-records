"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ClientHistoryEntry, ClientRecord, DistanceMeta } from "@/lib/records";
import { DistanceTabs } from "./distance-tabs";
import { ToggleGroup } from "./toggle-group";
import { SearchBox } from "./search-box";
import { RecordCard } from "./record-card";
import { RecordHistoryPanel } from "./record-history";

type Gender = "M" | "F";
type RecordType = "AGE_GROUP" | "OVERALL";
type GenderFilter = "ALL" | Gender;

const GENDER_OPTIONS = [
  { value: "ALL" as GenderFilter, label: "All" },
  { value: "F" as GenderFilter, label: "Women's" },
  { value: "M" as GenderFilter, label: "Men's" },
];

const TYPE_OPTIONS = [
  { value: "AGE_GROUP" as RecordType, label: "Age Group" },
  { value: "OVERALL" as RecordType, label: "Overall" },
];

const CATEGORY_ORDER = ["Under 40", "20-39", "40-49", "50-59", "60-69", "70+"];
function categoryRank(cat: string): number {
  const i = CATEGORY_ORDER.indexOf(cat);
  return i === -1 ? 99 : i;
}

const GENDER_SECTION_LABEL: Record<Gender, string> = { F: "Women's", M: "Men's" };

interface SectionFootnote {
  id: string;
  symbol: string;
  text: string;
}

/** Footnotes used by a section's cards, in the order they first appear —
 * rendered as a legend below that section, like the notes under each table
 * in the spreadsheet. Keyed by text, not symbol: the sheet reuses "**" for
 * unrelated footnotes. */
function collectFootnotes(gender: Gender, cards: { entries: ClientRecord[] }[]): SectionFootnote[] {
  const byText = new Map<string, SectionFootnote>();
  for (const card of cards) {
    for (const e of card.entries) {
      if (!e.name || !e.footnote || byText.has(e.footnote)) continue;
      byText.set(e.footnote, {
        id: `footnote-${gender}-${byText.size + 1}`,
        symbol: e.footnoteSymbol ?? "*",
        text: e.footnote,
      });
    }
  }
  return [...byText.values()];
}

export function RecordsExplorer({
  distances,
  records,
  history,
}: {
  distances: DistanceMeta[];
  records: ClientRecord[];
  history: ClientHistoryEntry[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const sortedDistances = useMemo(
    () => [...distances].sort((a, b) => a.sortOrder - b.sortOrder),
    [distances],
  );

  const [distanceSlug, setDistanceSlug] = useState(
    () => searchParams.get("distance") ?? sortedDistances[0]?.slug ?? "",
  );
  const [gender, setGender] = useState<GenderFilter>(
    () => (searchParams.get("gender") as GenderFilter) || "ALL",
  );
  const [type, setType] = useState<RecordType>(
    () => (searchParams.get("type") as RecordType) || "AGE_GROUP",
  );
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");

  useEffect(() => {
    const params = new URLSearchParams();
    if (distanceSlug) params.set("distance", distanceSlug);
    if (gender !== "ALL") params.set("gender", gender);
    if (type !== "AGE_GROUP") params.set("type", type);
    if (query) params.set("q", query);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    // Only re-sync when the filter state itself changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distanceSlug, gender, type, query]);

  const currentDistance = sortedDistances.find((d) => d.slug === distanceSlug) ?? sortedDistances[0];

  const genders: Gender[] = gender === "ALL" ? ["F", "M"] : [gender];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      if (!currentDistance || r.distanceSlug !== currentDistance.slug) return false;
      if (r.recordType !== type) return false;
      if (!genders.includes(r.gender)) return false;
      if (q) {
        const haystack = `${r.name ?? ""} ${r.event ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, currentDistance, type, gender, query]);

  const isSearching = query.trim().length > 0;

  const sections =
    type === "AGE_GROUP"
      ? genders.map((g) => {
          const byCategory = new Map<string, ClientRecord[]>();
          for (const r of filtered) {
            if (r.gender !== g || !r.ageCategory) continue;
            if (!byCategory.has(r.ageCategory)) byCategory.set(r.ageCategory, []);
            byCategory.get(r.ageCategory)!.push(r);
          }
          const cards = [...byCategory.entries()]
            .sort(([a], [b]) => categoryRank(a) - categoryRank(b))
            .map(([category, entries]) => ({
              key: category,
              title: category,
              entries: entries.sort((a, b) => a.rank - b.rank),
            }));
          return { gender: g, cards, footnotes: collectFootnotes(g, cards) };
        })
      : genders.map((g) => {
          const entries = filtered.filter((r) => r.gender === g).sort((a, b) => a.rank - b.rank);
          const cards =
            entries.length > 0 ? [{ key: "overall", title: `${GENDER_SECTION_LABEL[g]} Overall`, entries }] : [];
          return { gender: g, cards, footnotes: collectFootnotes(g, cards) };
        });

  const hasAnyCards = sections.some((s) => s.cards.length > 0);

  const historyForDistance = useMemo(
    () => history.filter((h) => currentDistance && h.distanceSlug === currentDistance.slug),
    [history, currentDistance],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-16 pt-6 sm:px-6">
      <DistanceTabs distances={sortedDistances} selected={distanceSlug} onSelect={setDistanceSlug} />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <ToggleGroup label="Gender" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
          <ToggleGroup label="Record type" options={TYPE_OPTIONS} value={type} onChange={setType} />
        </div>
        <SearchBox value={query} onChange={setQuery} />
      </div>

      {!hasAnyCards ? (
        <p className="mt-10 rounded-xl border border-border bg-surface p-6 text-center text-muted">
          {isSearching ? "No records match your search." : "No records for this view."}
        </p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {sections.map(
            (section) =>
              section.cards.length > 0 && (
                <div key={section.gender}>
                  {gender === "ALL" && (
                    <h2 className="mb-3 text-sm font-semibold text-primary">
                      {GENDER_SECTION_LABEL[section.gender]}
                    </h2>
                  )}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {section.cards.map((card) => (
                      <RecordCard
                        key={card.key}
                        title={card.title}
                        entries={card.entries}
                        unit={currentDistance?.unit ?? "time"}
                        footnoteAnchor={(text) => section.footnotes.find((f) => f.text === text)!.id}
                      />
                    ))}
                  </div>
                  {section.footnotes.length > 0 && (
                    <ul className="mt-3 flex flex-col gap-1 text-xs text-muted">
                      {section.footnotes.map((f) => (
                        <li key={f.id} id={f.id} className="scroll-mt-4 target:text-foreground">
                          <span className="mr-1 font-semibold text-secondary">{f.symbol}</span>
                          {f.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ),
          )}
        </div>
      )}

      <RecordHistoryPanel entries={historyForDistance} genders={genders} />
    </div>
  );
}

import type { ClientBadge } from "@/lib/c25k";
import { Clock, Flag, Moon, Runner, Star, Sun, Trophy } from "@/components/c25k-icons";

const SECTION_ORDER = ["Weekly", "Milestones", "Time", "Fun"] as const;

const WEEKLY_SLUG = /^week-(\d+)-complete$/;
const SESSION_COUNT_SLUG = /^sessions-(\d+)$/;

const TIME_LABELS: Record<string, string> = {
  "time-10": "10 Min",
  "time-20": "20 Min",
  "time-40": "40 Min",
  "time-60": "1 Hour",
  "time-120": "2 Hours",
  "time-180": "3 Hours",
};

function NumberFace({ top, bottom }: { top?: string; bottom: string }) {
  return (
    <span className="flex flex-col items-center leading-none">
      {top && <span className="text-[5px] font-bold tracking-wide">{top}</span>}
      <span className={top ? "text-xs font-extrabold" : "text-sm font-extrabold"}>{bottom}</span>
    </span>
  );
}

/** Weekly badges, and the session-count Milestones, show their number as
 * the badge face itself ("WEEK 1!", "5") rather than a shared icon — the
 * rest of Milestones and all of Fun get their own distinct icon so no two
 * badges in the same section look alike. */
function faceFor(badge: ClientBadge) {
  if (badge.section === "Weekly") {
    const weekNumber = badge.slug.match(WEEKLY_SLUG)?.[1];
    return <NumberFace top="WEEK" bottom={`${weekNumber}!`} />;
  }

  const sessionCount = badge.slug.match(SESSION_COUNT_SLUG)?.[1];
  if (sessionCount) return <NumberFace bottom={sessionCount} />;

  switch (badge.slug) {
    case "getting-started":
      return <Star className="h-5 w-5" />;
    case "first-run":
      return <Runner className="h-5 w-5" />;
    case "first-solo-run":
      return <Flag className="h-5 w-5" />;
    case "early-bird":
      return <Sun className="h-5 w-5" />;
    case "night-owl":
      return <Moon className="h-5 w-5" />;
    case "perfect-week":
      return <Trophy className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />; // the six Time badges
  }
}

/** The short, always-visible label under each tile — Weekly skips this
 * (its face already reads as "WEEK 1!" on its own); every other badge gets
 * one, so the rack is scannable without hovering or opening the tooltip. */
function shortLabel(badge: ClientBadge): string | null {
  if (badge.section === "Weekly") return null;
  const sessionCount = badge.slug.match(SESSION_COUNT_SLUG)?.[1];
  if (sessionCount) return `${sessionCount} Sessions`;
  if (badge.slug === "first-run") return "First Run";
  if (badge.slug === "first-solo-run") return "First Solo";
  if (badge.slug in TIME_LABELS) return TIME_LABELS[badge.slug];
  if (badge.slug === "early-bird") return "Early Bird";
  if (badge.slug === "night-owl") return "Night Owl";
  if (badge.slug === "perfect-week") return "Perfect Week";
  return badge.name;
}

// One unified "earned" look (gold fill, black outline) regardless of
// section — a badge either has the look or it doesn't; category no
// longer drives color. Unearned stays a genuine neutral grey, not a
// theme tone, so "locked" reads unambiguously against every other
// (warm, colorful) tile on the page.
function colorClassName(badge: ClientBadge): string {
  if (!badge.earned) return "border-gray-400 bg-gray-200 text-gray-400";
  return "border-black bg-c25k-current-accent text-foreground";
}

/** The badge rack — every badge in the catalog, grouped into the same four
 * mini-sections, always as a grid (there's no longer a narrow-sidebar case
 * to accommodate with a scrolling strip — this only ever renders inside
 * the modal now, see badge-modal.tsx). Locked badges render dim rather
 * than being hidden, so the whole set stays visible as something to aim
 * for. */
export function BadgeRack({ badges }: { badges: ClientBadge[] }) {
  return (
    <div className="flex flex-col gap-5 rounded-2xl bg-surface p-4">
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted">Badges</h3>
      {SECTION_ORDER.map((section) => {
        const items = badges.filter((b) => b.section === section);
        if (items.length === 0) return null;
        return (
          <div key={section} className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted">{section}</span>
            <div className="grid grid-cols-3 gap-x-3 gap-y-4">
              {items.map((badge) => {
                const label = shortLabel(badge);
                return (
                  <div key={badge.slug} className="group relative flex flex-col items-center gap-1">
                    <button
                      type="button"
                      aria-label={`${badge.name} — ${badge.description}${badge.earned ? "" : " (not yet earned)"}`}
                      className={`flex h-11 w-11 items-center justify-center rounded-full border-2 transition-colors ${colorClassName(badge)}`}
                    >
                      {faceFor(badge)}
                    </button>
                    {label && (
                      <span className="text-center text-[10px] leading-tight text-muted" aria-hidden="true">
                        {label}
                      </span>
                    )}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-36 -translate-x-1/2 rounded-lg bg-foreground px-2.5 py-1.5 text-center text-xs font-medium text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                    >
                      {badge.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

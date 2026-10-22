"use client";

import { forwardRef, type CSSProperties } from "react";
import { Star, Trophy } from "@/components/c25k-icons";

export type CelebrationData =
  | {
      kind: "welcome";
      firstName: string;
      newlyEarnedBadges: { slug: string; name: string }[];
    }
  | {
      kind: "session";
      firstName: string;
      weekNumber: number;
      sessionOrder: number;
      durationMinutes: number | null;
      weekComplete: boolean;
      milestone: boolean;
      hasMiss: boolean;
      newlyEarnedBadges: { slug: string; name: string }[];
    };

// A full-viewport falling-confetti overlay — only for a whole-week finish
// (see where it's used below), not every plain session completion. Each
// piece gets its own left position / fall distance / drift / rotation via
// inline CSS vars; one shared keyframe (globals.css) reads them. Still no
// library — vw/vh-based transforms instead of fixed-px ones are what make
// it cover the screen on any device size rather than bursting from one spot.
const CONFETTI_COLORS = ["var(--color-primary)", "var(--color-c25k-complete)", "var(--color-c25k-current-accent)", "#ffffff"];

const CONFETTI: { left: number; drift: number; rot: number; delay: number; duration: number }[] = Array.from(
  { length: 20 },
  (_, i) => ({
    left: (i * 37) % 100, // spread across the width without a visible repeating pattern
    drift: ((i % 5) - 2) * 6, // small left/right wobble as it falls
    rot: i % 2 === 0 ? 280 + i * 7 : -(280 + i * 5),
    delay: (i * 53) % 450,
    duration: 2400 + ((i * 97) % 900),
  }),
);

function Confetti() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {CONFETTI.map((p, i) => (
        <span
          key={i}
          className="c25k-confetti-piece absolute top-0 h-2.5 w-2.5 rounded-sm"
          style={
            {
              left: `${p.left}%`,
              backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
              "--drift": `${p.drift}vw`,
              "--rot": `${p.rot}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function milestoneSubMessage(weekNumber: number): string {
  if (weekNumber === 3) return "First milestone done — the habit's building!";
  if (weekNumber === 6) return "Halfway there — brilliant work!";
  return "Final week done — your first 5K awaits!";
}

function heading(data: CelebrationData): string {
  if (data.kind === "welcome") return "Welcome!";
  return `Week ${data.weekNumber} Run ${data.sessionOrder}`;
}

function subMessage(data: CelebrationData): string {
  if (data.kind === "welcome") {
    return "You've taken the first step in your Couch to 5K journey!";
  }

  const ran = data.durationMinutes != null ? `You ran for ${data.durationMinutes} minutes. ` : "";

  if (data.weekComplete) {
    if (data.milestone) return `${ran}${milestoneSubMessage(data.weekNumber)}`;
    if (data.hasMiss) return `${ran}You've made it through the week — on to the next one!`;
    return `${ran}And that's the whole week done — brilliant work!`;
  }

  return ran ? `${ran}Congratulations!` : "Congratulations!";
}

function joinWithAnd(names: string[]): string {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The welcome screen names its one badge explicitly ("badge" has to
 * appear in the sentence) rather than the generic "You've also earned:"
 * phrasing every other celebration uses for however many it's showing. */
function badgeCallout(data: CelebrationData): string | null {
  if (data.newlyEarnedBadges.length === 0) return null;
  if (data.kind === "welcome") {
    return `You've earned the ${data.newlyEarnedBadges[0].name} badge!`;
  }
  return `You've also earned: ${joinWithAnd(data.newlyEarnedBadges.map((b) => b.name))}`;
}

/** Fires on any transition into Completed status (a direct tick or a
 * Missed→Completed correction — see plan-view.tsx's `isNewCompletion`),
 * or once ever on a runner's first visit to /my-plan (the "welcome"
 * variant, from a mount effect calling claimWelcomeBadge — see
 * plan-view.tsx). Centered (via `m-auto`, the same fix the badge/
 * session-log modals needed); confetti for a whole-week finish *or* the
 * welcome moment — both get the full celebratory treatment, nothing
 * held back for a first-time runner's very first moment on the site.
 * Any badge(s) just earned are surfaced alongside the usual message —
 * the welcome screen's own phrasing names its badge explicitly ("you've
 * earned the X badge!"), everything else uses the generic "You've also
 * earned: …" line (see badgeCallout), but both read the badge's actual
 * name from the server rather than a hardcoded string. */
export const CompletionCelebration = forwardRef<HTMLDialogElement, { data: CelebrationData | null }>(
  function CompletionCelebration({ data }, ref) {
    if (!data) return <dialog ref={ref} className="c25k-celebration" />;

    const showConfetti = data.kind === "welcome" || data.weekComplete;
    const accentClass =
      data.kind === "welcome"
        ? "bg-c25k-current-accent text-foreground"
        : data.milestone
          ? "bg-c25k-current-accent text-foreground"
          : data.weekComplete && !data.hasMiss
            ? "bg-c25k-complete text-white"
            : "bg-primary text-primary-foreground";

    return (
      <dialog
        ref={ref}
        aria-label={data.kind === "welcome" ? "Welcome" : "Session complete"}
        className="c25k-celebration m-auto w-[min(92vw,26rem)] overflow-visible bg-transparent p-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) (e.currentTarget as HTMLDialogElement).close();
        }}
      >
        {showConfetti && <Confetti />}

        <div className="c25k-toast overflow-hidden rounded-3xl bg-surface shadow-xl">
          <div className={`relative flex flex-col items-center gap-3 overflow-hidden px-6 py-8 text-center ${accentClass}`}>
            <Star className="absolute left-7 top-6 h-3.5 w-3.5 opacity-80" />
            <Star className="absolute right-9 top-10 h-2.5 w-2.5 opacity-70" />
            <Star className="absolute right-6 bottom-8 h-3 w-3 opacity-70" />

            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/25">
              <Trophy className="h-9 w-9" />
            </span>

            <h2 className="relative text-2xl font-bold uppercase tracking-wide">{heading(data)}</h2>
            <p className="relative text-sm font-medium opacity-95">{subMessage(data)}</p>
            {badgeCallout(data) && <p className="relative text-sm font-bold opacity-95">{badgeCallout(data)}</p>}
            {data.kind === "welcome" && (
              <span className="relative mt-1 flex h-16 w-16 items-center justify-center rounded-full bg-white/25">
                <Star className="h-9 w-9" />
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 p-5">
            <button
              type="button"
              onClick={(e) => (e.currentTarget.closest("dialog") as HTMLDialogElement)?.close()}
              className="w-full rounded-full bg-primary py-3 text-base font-bold text-primary-foreground shadow-sm"
            >
              Continue
            </button>
            <p className="text-center text-xs text-muted">Peacehaven Run Club · Couch to 5K</p>
          </div>
        </div>
      </dialog>
    );
  },
);

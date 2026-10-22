"use client";

import { forwardRef, type CSSProperties } from "react";
import { Star, Trophy } from "@/components/c25k-icons";

export interface CelebrationData {
  firstName: string;
  weekNumber: number;
  sessionOrder: number;
  durationMinutes: number | null;
  weekComplete: boolean;
  milestone: boolean;
  hasMiss: boolean;
  newlyEarnedBadges: { slug: string; name: string }[];
}

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

function subMessage(data: CelebrationData): string {
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

/** Fires on any transition into Completed status — a direct tick or a
 * Missed→Completed correction, both genuinely are one (see plan-view.tsx's
 * `isNewCompletion`). Centered (via `m-auto`, the same fix the badge/
 * session-log modals needed), confetti only for a whole-week finish, and
 * any badge(s) that completion just earned surfaced alongside the usual
 * message. The week/milestone case is folded into this same screen, not a
 * second celebration on top of it. */
export const CompletionCelebration = forwardRef<HTMLDialogElement, { data: CelebrationData | null }>(
  function CompletionCelebration({ data }, ref) {
    if (!data) return <dialog ref={ref} className="c25k-celebration" />;

    const accentClass = data.milestone
      ? "bg-c25k-current-accent text-foreground"
      : data.weekComplete && !data.hasMiss
        ? "bg-c25k-complete text-white"
        : "bg-primary text-primary-foreground";

    return (
      <dialog
        ref={ref}
        aria-label="Session complete"
        className="c25k-celebration m-auto w-[min(92vw,26rem)] overflow-visible bg-transparent p-0"
        onClick={(e) => {
          if (e.target === e.currentTarget) (e.currentTarget as HTMLDialogElement).close();
        }}
      >
        {data.weekComplete && <Confetti />}

        <div className="c25k-toast overflow-hidden rounded-3xl bg-surface shadow-xl">
          <div className={`relative flex flex-col items-center gap-3 overflow-hidden px-6 py-8 text-center ${accentClass}`}>
            <Star className="absolute left-7 top-6 h-3.5 w-3.5 opacity-80" />
            <Star className="absolute right-9 top-10 h-2.5 w-2.5 opacity-70" />
            <Star className="absolute right-6 bottom-8 h-3 w-3 opacity-70" />

            <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/25">
              <Trophy className="h-9 w-9" />
            </span>

            <h2
              className="relative text-2xl font-bold uppercase tracking-wide"
              style={{ fontFamily: "var(--font-lilita)" }}
            >
              Week {data.weekNumber} Run {data.sessionOrder}
            </h2>
            <p className="relative text-sm font-medium opacity-95">{subMessage(data)}</p>
            {data.newlyEarnedBadges.length > 0 && (
              <p className="relative text-sm font-bold opacity-95">
                You&apos;ve also earned: {joinWithAnd(data.newlyEarnedBadges.map((b) => b.name))}
              </p>
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

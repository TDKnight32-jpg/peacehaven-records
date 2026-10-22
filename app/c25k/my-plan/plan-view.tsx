"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { SessionStatus } from "@prisma/client";
import type { ClientBadge, ClientC25kSession, ClientC25kWeek } from "@/lib/c25k";
import { Check, Close, Flag, Lock, Runner } from "@/components/c25k-icons";
import { BadgeModalButton } from "./badge-modal";
import { SessionLogButton } from "./session-log-modal";
import { CompletionCelebration, type CelebrationData } from "./completion-celebration";
import { claimWelcomeBadge, revertSession, setSessionStatus } from "./actions";

// Weeks 3, 6 and 9 (every third week, for any plan length) are milestones —
// bigger markers, a flag instead of a plain number, and their own
// completion message.
function isMilestoneWeek(weekNumber: number): boolean {
  return weekNumber % 3 === 0;
}

function greeting(
  firstName: string,
  completedWeeks: number,
  completedSessions: number,
  totalSessions: number,
  allResolved: boolean,
): string {
  if (totalSessions > 0 && completedSessions === totalSessions) {
    return `You did it, ${firstName} — you've completed the whole programme!`;
  }
  if (totalSessions > 0 && allResolved) {
    return `You've made it through the programme, ${firstName} — nice work seeing it through!`;
  }
  if (completedWeeks === 0 && completedSessions === 0) {
    return `Welcome, ${firstName} — ready to take your first step?`;
  }
  if (completedWeeks === 0) {
    return `You're underway, ${firstName} — keep those first steps coming!`;
  }
  const weekWord = completedWeeks === 1 ? "week" : "weeks";
  return `You're ${completedWeeks} ${weekWord} into your journey, ${firstName}!`;
}

function weekCardClassName(week: ClientC25kWeek): string {
  if (week.status === "complete") {
    return week.hasMissedSession
      ? "overflow-hidden rounded-2xl bg-c25k-current-bg"
      : "overflow-hidden rounded-2xl bg-c25k-complete-bg";
  }
  if (week.status === "current") return "overflow-hidden rounded-2xl bg-surface shadow-sm";
  return "overflow-hidden rounded-2xl border border-border bg-background";
}

function WeekMarker({ week, milestone, nudge }: { week: ClientC25kWeek; milestone: boolean; nudge: number }) {
  const size = milestone ? "h-14 w-14" : "h-10 w-10";
  const iconSize = milestone ? "h-6 w-6" : "h-5 w-5";
  const icon = milestone ? <Flag className={iconSize} /> : <Runner className={iconSize} />;
  const style = { transform: `translateX(${nudge}px)` };

  if (week.status === "complete") {
    const colorClass = week.hasMissedSession
      ? "border-c25k-current bg-c25k-current"
      : "border-c25k-complete bg-c25k-complete";
    return (
      <span style={style} className={`flex ${size} flex-shrink-0 items-center justify-center rounded-full border-2 ${colorClass} text-white`}>
        {icon}
      </span>
    );
  }

  if (week.status === "current") {
    return (
      <span style={style} className="relative flex flex-shrink-0 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-c25k-current-accent/60 motion-safe:animate-ping" />
        <span
          className={`relative flex ${size} items-center justify-center rounded-full border-2 border-c25k-current-accent bg-surface text-c25k-current`}
        >
          {icon}
        </span>
      </span>
    );
  }

  return (
    <span
      style={style}
      className={`flex ${size} flex-shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-sm font-bold text-muted`}
    >
      {milestone ? icon : week.weekNumber}
    </span>
  );
}

/** One session's row — shape depends entirely on its lock status:
 * - "locked": no controls at all, just a dimmed row with a lock icon.
 * - "current": the only resolvable one — a Done button and a Missed
 *   button side by side.
 * - "completed" / "missed": already resolved — a status chip, a small
 *   "mark as X instead" swap link, and (only for the single
 *   most-recently-resolved session — `canRevert`) an "Undo" link back to
 *   unresolved. A completed one's label is a button opening the logging
 *   modal (session-log-modal.tsx) instead of plain text; a missed one has
 *   nothing to log, so it stays plain text. */
function SessionRow({
  cohortId,
  session,
  isPending,
  poppingSessionId,
  onResolve,
  onRevert,
}: {
  cohortId: string;
  session: ClientC25kSession;
  isPending: boolean;
  poppingSessionId: string | null;
  onResolve: (session: ClientC25kSession, status: SessionStatus) => void;
  onRevert: (session: ClientC25kSession) => void;
}) {
  const label = (
    <span className="min-w-0 flex-1 text-sm">
      <span className="font-medium">{session.dayLabel}</span>
      {session.description && <span className="text-muted"> — {session.description}</span>}
    </span>
  );

  if (session.status === "locked") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border p-3 opacity-60">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-border text-muted">
          <Lock className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 text-sm text-muted">
          <span className="font-medium">{session.dayLabel}</span>
          {session.description && <span> — {session.description}</span>}
        </span>
      </div>
    );
  }

  if (session.status === "current") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onResolve(session, "COMPLETED")}
          aria-label={`Mark ${session.dayLabel} complete`}
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-border text-muted transition-colors hover:border-c25k-complete hover:bg-c25k-complete-bg hover:text-c25k-complete ${
            poppingSessionId === session.id ? "c25k-pop" : ""
          }`}
        >
          <Check className="h-4 w-4" />
        </button>
        {label}
        <button
          type="button"
          disabled={isPending}
          onClick={() => onResolve(session, "MISSED")}
          className="flex-shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted transition-colors hover:border-c25k-current hover:text-c25k-current"
        >
          Missed
        </button>
      </div>
    );
  }

  const isCompleted = session.status === "completed";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        isCompleted ? "border-c25k-complete bg-c25k-complete-bg" : "border-c25k-current bg-c25k-current-bg"
      }`}
    >
      <span
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border-2 text-white ${
          isCompleted ? "border-c25k-complete bg-c25k-complete" : "border-c25k-current bg-c25k-current"
        } ${poppingSessionId === session.id ? "c25k-pop" : ""}`}
      >
        {isCompleted ? <Check className="h-4 w-4" /> : <Close className="h-4 w-4" />}
      </span>
      {isCompleted ? <SessionLogButton cohortId={cohortId} session={session} /> : label}
      <div className="flex flex-shrink-0 flex-col items-end gap-1 text-xs font-semibold">
        <button
          type="button"
          disabled={isPending}
          onClick={() => onResolve(session, isCompleted ? "MISSED" : "COMPLETED")}
          className="text-muted underline-offset-2 hover:underline"
        >
          Mark as {isCompleted ? "missed" : "done"} instead
        </button>
        {session.canRevert && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onRevert(session)}
            className="text-muted underline-offset-2 hover:underline"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}

export function PlanView({
  cohortId,
  weeks,
  firstName,
  badges,
}: {
  cohortId: string;
  weeks: ClientC25kWeek[];
  firstName: string;
  badges: ClientBadge[];
}) {
  const [isPending, startTransition] = useTransition();
  const [poppingSessionId, setPoppingSessionId] = useState<string | null>(null);
  const [celebrationData, setCelebrationData] = useState<CelebrationData | null>(null);
  const popTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrationDialogRef = useRef<HTMLDialogElement>(null);

  const totalSessions = weeks.reduce((sum, w) => sum + w.sessions.length, 0);
  const completedSessions = weeks.reduce((sum, w) => sum + w.sessions.filter((s) => s.status === "completed").length, 0);
  const completedWeeks = weeks.filter((w) => w.status === "complete" && !w.hasMissedSession).length;
  const allResolved = weeks.length > 0 && weeks.every((w) => w.status === "complete");
  const percent = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  // Opens only once `celebrationData` actually lands (after the re-render
  // that carries it), not synchronously in the click handler — calling
  // `showModal()` right after `setCelebrationData` would race React's
  // batched update and could open the dialog a tick before it has content.
  useEffect(() => {
    if (celebrationData) celebrationDialogRef.current?.showModal();
  }, [celebrationData]);

  // Checked once on every mount — idempotent server-side (see
  // claimWelcomeBadge), so after a runner's genuine first visit this is
  // just a cheap lookup that no-ops on every later one. A ref (not just
  // relying on the empty dependency array) guards against StrictMode's
  // deliberate double-invoke of effects in development firing it twice
  // in the same mount.
  const welcomeClaimed = useRef(false);
  useEffect(() => {
    if (welcomeClaimed.current) return;
    welcomeClaimed.current = true;

    claimWelcomeBadge(cohortId).then((result) => {
      if (result?.awarded && result.badge) {
        setCelebrationData({
          kind: "welcome",
          firstName,
          newlyEarnedBadges: [result.badge],
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleResolve(week: ClientC25kWeek, session: ClientC25kSession, status: SessionStatus) {
    // The celebration screen fires on any transition into Completed —
    // including a Missed→Completed swap, since it genuinely is a
    // completion either way — but never for Missed itself.
    const isNewCompletion = status === "COMPLETED";

    setPoppingSessionId(session.id);
    if (popTimeout.current) clearTimeout(popTimeout.current);
    popTimeout.current = setTimeout(() => setPoppingSessionId(null), 450);

    // An async function passed to startTransition (React 19's "actions"
    // support) rather than fire-and-forget — the celebration needs the
    // server's answer on which badges this just earned before it can open,
    // so this one has to actually wait for the round-trip.
    startTransition(async () => {
      const result = await setSessionStatus(cohortId, session.id, status);

      if (isNewCompletion) {
        const weekComplete = week.sessions.every((s) => s.id === session.id || s.status === "completed" || s.status === "missed");
        const hasMiss = week.sessions.some((s) => s.id !== session.id && s.status === "missed");
        setCelebrationData({
          kind: "session",
          firstName,
          weekNumber: week.weekNumber,
          sessionOrder: session.order,
          durationMinutes: session.durationMinutes,
          weekComplete,
          milestone: weekComplete && !hasMiss && isMilestoneWeek(week.weekNumber),
          hasMiss: weekComplete && hasMiss,
          newlyEarnedBadges: result?.newlyEarnedBadges ?? [],
        });
      }
    });
  }

  function handleRevert(session: ClientC25kSession) {
    startTransition(() => {
      revertSession(cohortId, session.id);
    });
  }

  return (
    <div className="mt-6 flex flex-col gap-5">
      <div className="rounded-2xl bg-surface p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary-100">
            <Runner className="h-6 w-6 text-primary" />
          </span>
          <div className="min-w-0 flex-1 pt-1">
            <p className="text-lg font-bold leading-snug">
              {greeting(firstName, completedWeeks, completedSessions, totalSessions, allResolved)}
            </p>
            <p className="mt-0.5 text-sm text-muted">{percent}% of the way to your first 5K</p>
          </div>
          <BadgeModalButton badges={badges} />
        </div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-primary-100">
          <div
            className="h-full rounded-full bg-c25k-complete transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {weeks.map((week, i) => {
          const milestone = isMilestoneWeek(week.weekNumber);
          const isLast = i === weeks.length - 1;
          const nudge = milestone ? 0 : i % 2 === 0 ? 6 : -6;
          const missedCount = week.sessions.filter((s) => s.status === "missed").length;

          return (
            <div key={week.id} className="flex gap-3">
              <div className="flex w-14 flex-shrink-0 flex-col items-center">
                <WeekMarker week={week} milestone={milestone} nudge={nudge} />
                {week.status === "current" && (
                  <span className="mt-1.5 text-center text-[10px] font-bold uppercase leading-tight tracking-wide text-c25k-current">
                    You are
                    <br />
                    here
                  </span>
                )}
                {!isLast && (
                  <div
                    className="w-0 flex-grow border-l-2 border-dotted"
                    style={{
                      borderColor:
                        week.status === "upcoming"
                          ? "var(--color-border)"
                          : week.status === "complete" && week.hasMissedSession
                            ? "var(--color-c25k-current)"
                            : "var(--color-c25k-complete)",
                    }}
                  />
                )}
              </div>

              <div className={`${weekCardClassName(week)} flex-1`}>
                {week.status === "current" && <div className="h-1 bg-c25k-current-accent" />}
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-semibold ${week.status === "upcoming" ? "text-muted" : "text-foreground"}`}>
                      Week {week.weekNumber}: {week.title}
                    </h3>
                    <div className="flex-grow" />
                    <div className="flex flex-shrink-0 gap-1.5">
                      {milestone && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-c25k-current-accent px-2.5 py-1 text-xs font-bold text-foreground">
                          <Flag className="h-3 w-3" />
                          Milestone
                        </span>
                      )}
                      {week.status === "complete" && week.hasMissedSession && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-c25k-current px-2.5 py-1 text-xs font-bold text-white">
                          Done — {missedCount} missed
                        </span>
                      )}
                      {week.status === "complete" && !week.hasMissedSession && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-c25k-complete px-2.5 py-1 text-xs font-bold text-white">
                          <Check className="h-2.5 w-2.5" />
                          Complete
                        </span>
                      )}
                      {week.status === "current" && (
                        <span className="rounded-full bg-c25k-current-bg px-2.5 py-1 text-xs font-bold text-c25k-current">
                          Current week
                        </span>
                      )}
                    </div>
                  </div>

                  {week.description && (
                    <p className={`mt-1 text-sm ${week.status === "upcoming" ? "text-muted" : "text-foreground/80"}`}>
                      {week.description}
                    </p>
                  )}

                  <ul className="mt-3 flex flex-col gap-2">
                    {week.sessions.map((session) => (
                      <li key={session.id}>
                        <SessionRow
                          cohortId={cohortId}
                          session={session}
                          isPending={isPending}
                          poppingSessionId={poppingSessionId}
                          onResolve={(s, status) => handleResolve(week, s, status)}
                          onRevert={handleRevert}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <CompletionCelebration ref={celebrationDialogRef} data={celebrationData} />
    </div>
  );
}

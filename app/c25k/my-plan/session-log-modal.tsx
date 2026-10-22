"use client";

import { useRef, useTransition } from "react";
import type { ClientC25kSession } from "@/lib/c25k";
import { Close, MoodFace } from "@/components/c25k-icons";
import { logSessionDetails } from "./actions";

const MOOD_LEVELS = [1, 2, 3, 4, 5] as const;

function summaryFor(session: ClientC25kSession): string | null {
  const parts: string[] = [];
  if (session.durationMinutes != null) parts.push(`${session.durationMinutes} min`);
  if (session.sessionType) parts.push(session.sessionType === "SOLO" ? "Solo" : "Group");
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** The day-label part of a completed session's row, as a button that opens
 * a logging modal — replaces the old always-visible inline fields. Every
 * field inside still saves itself the moment it's set, same as before;
 * the modal is just somewhere to put them (plus the new mood rating)
 * without cluttering the row they're attached to. */
export function SessionLogButton({ cohortId, session }: { cohortId: string; session: ClientC25kSession }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [, startTransition] = useTransition();
  const summary = summaryFor(session);

  function save(patch: {
    durationMinutes?: number | null;
    sessionType?: "SOLO" | "GROUP" | null;
    timeOfDay?: string | null;
    mood?: number | null;
  }) {
    startTransition(() => {
      logSessionDetails(cohortId, session.id, patch);
    });
  }

  return (
    <>
      <button type="button" onClick={() => dialogRef.current?.showModal()} className="min-w-0 flex-1 text-left">
        <span className="block text-sm">
          <span className="font-medium">{session.dayLabel}</span>
          {session.description && <span className="text-muted"> — {session.description}</span>}
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted">
          {session.mood && <MoodFace level={session.mood as 1 | 2 | 3 | 4 | 5} className="h-3.5 w-3.5" />}
          {summary ?? "Tap to log details"}
        </span>
      </button>

      {/* Same native <dialog> pattern as the badges modal, including its
       * two fixes: `overflow-visible` on the dialog itself (its own default
       * `overflow: auto` would otherwise clip the close button's
       * deliberately-outside-the-box offset) and `p-2` so that offset lands
       * on the dialog's own edge rather than past it. */}
      <dialog
        ref={dialogRef}
        className="c25k-badge-modal m-auto w-[min(90vw,22rem)] overflow-visible bg-transparent p-2"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="relative rounded-2xl bg-surface p-4">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-md"
          >
            <Close className="h-4 w-4" />
          </button>

          <h3 className="pr-8 text-sm font-bold text-foreground">
            {session.dayLabel}
            {session.description && <span className="font-normal text-muted"> — {session.description}</span>}
          </h3>

          <label className="mt-4 flex items-center justify-between gap-3 text-sm">
            <span>Minutes</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={180}
              placeholder="—"
              defaultValue={session.durationMinutes ?? ""}
              onBlur={(e) => save({ durationMinutes: e.target.value === "" ? null : Number(e.target.value) })}
              className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-right text-foreground"
            />
          </label>

          <div className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span>Solo or group</span>
            <div className="flex gap-1">
              {(["SOLO", "GROUP"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => save({ sessionType: session.sessionType === type ? null : type })}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    session.sessionType === type
                      ? "bg-primary text-primary-foreground"
                      : "border border-border bg-background text-muted"
                  }`}
                >
                  {type === "SOLO" ? "Solo" : "Group"}
                </button>
              ))}
            </div>
          </div>

          <label className="mt-3 flex items-center justify-between gap-3 text-sm">
            <span>Time of day</span>
            <input
              type="time"
              defaultValue={session.timeOfDay ?? ""}
              onChange={(e) => save({ timeOfDay: e.target.value === "" ? null : e.target.value })}
              className="rounded-lg border border-border bg-background px-2 py-1 text-foreground"
            />
          </label>

          <div className="mt-4">
            <span className="text-sm">How did it feel?</span>
            <div className="mt-2 flex justify-between gap-1">
              {MOOD_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => save({ mood: session.mood === level ? null : level })}
                  aria-label={`Mood ${level} of 5${session.mood === level ? " (selected)" : ""}`}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    session.mood === level
                      ? "border-primary bg-primary-100 text-primary"
                      : "border-border text-muted"
                  }`}
                >
                  <MoodFace level={level} className="h-6 w-6" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

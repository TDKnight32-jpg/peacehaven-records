"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import {
  approveSubmission,
  declineSubmission,
  type DecisionOutcome,
  type DecisionResult,
} from "@/app/officials/actions";
import type { PlacementSummary } from "@/lib/record-approval";
import { RecordCardThumb } from "./record-card-thumb";

export interface QueueSubmission {
  id: string;
  athleteName: string;
  distanceName: string;
  gender: string;
  ageCategory: string;
  performance: string;
  event: string;
  /** Pre-formatted on the server — see app/officials/page.tsx. */
  date: string;
  email: string;
  resultsUrl: string | null;
  hasPhoto: boolean;
  /** Pre-formatted on the server — see app/officials/page.tsx. */
  submittedAt: string;
  placements: PlacementSummary[];
}

export function OfficialsQueue({ submissions }: { submissions: QueueSubmission[] }) {
  // Live above the cards: a decided card drops out of the list (the action
  // revalidates this page), so its confirmation is shown up here instead.
  // Each stays until dismissed (or the page is left), newest first, so a
  // second decision doesn't take away the first one's card and message.
  const [decided, setDecided] = useState<DecisionOutcome[]>([]);

  return (
    <div className="mt-6 flex flex-col gap-6">
      {decided.map((o) => (
        <DecisionPanel key={o.id} outcome={o} onDismiss={() => setDecided((d) => d.filter((x) => x.id !== o.id))} />
      ))}

      {submissions.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-muted">
          No pending submissions — you&rsquo;re all caught up.
        </p>
      ) : (
        submissions.map((s) => (
          <SubmissionCard key={s.id} submission={s} onDecided={(o) => setDecided((d) => [o, ...d])} />
        ))
      )}
    </div>
  );
}

function SubmissionCard({
  submission: s,
  onDecided,
}: {
  submission: QueueSubmission;
  onDecided: (outcome: DecisionOutcome) => void;
}) {
  const [mode, setMode] = useState<"idle" | "approve" | "decline">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const changesRecords = s.placements.some((p) => p.entersList);

  function run(action: () => Promise<DecisionResult>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onDecided(result.outcome);
      else setError(result.error);
    });
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border border-t-4 border-t-gp-gold-edge bg-surface">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pt-5">
        <h3 className="text-lg font-bold text-foreground">
          {s.athleteName} <span className="font-medium text-muted">· {s.distanceName}</span>
        </h3>
        <p className="text-xs text-muted">Submitted {s.submittedAt}</p>
      </header>

      <div className="grid gap-5 px-5 pb-5 pt-4 sm:grid-cols-[1fr_1fr]">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted">Time</dt>
          <dd className="font-mono text-base font-semibold text-primary">{s.performance}</dd>
          <dt className="text-muted">Category</dt>
          <dd className="text-foreground">
            {s.gender} {s.ageCategory}
          </dd>
          <dt className="text-muted">Event</dt>
          <dd className="text-foreground">{s.event}</dd>
          <dt className="text-muted">Race date</dt>
          <dd className="text-foreground">{s.date}</dd>
          <dt className="text-muted">Submitter</dt>
          <dd className="min-w-0">
            <EmailWithCopy email={s.email} />
          </dd>
        </dl>

        <div className="rounded-lg bg-gp-row-gold px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gp-gold">If approved</p>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {s.placements.map((p) => (
              <li key={p.label} className={clsx(p.entersList ? "font-semibold text-foreground" : "text-muted")}>
                {p.entersList ? "★ " : "· "}
                {p.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="border-t border-border px-5 py-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-secondary">Proof</h4>
        <div className="mt-2 flex flex-col gap-3">
          {s.resultsUrl && (
            <p className="text-sm">
              <span className="text-muted">Results link: </span>
              <a
                href={s.resultsUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="break-all font-medium text-primary underline underline-offset-2 hover:text-secondary"
              >
                {s.resultsUrl}
              </a>
            </p>
          )}
          {s.hasPhoto && <ResultPhoto id={s.id} />}
        </div>
      </section>

      <footer className="border-t border-border bg-background px-5 py-4">
        {mode === "idle" && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setMode("approve")}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-secondary"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setMode("decline")}
              className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-gp-points-weak hover:text-gp-points-weak"
            >
              Decline
            </button>
          </div>
        )}

        {mode === "approve" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-foreground">
              {changesRecords
                ? "Publish this to the live records now? Anyone it displaces moves down a place."
                : "This doesn't make any top 3, so approving won't change the live records. Approve anyway?"}
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => approveSubmission(s.id))}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-secondary disabled:opacity-60"
              >
                {pending ? "Approving…" : "Confirm approval"}
              </button>
              <CancelButton disabled={pending} onClick={() => setMode("idle")} />
            </div>
          </div>
        )}

        {mode === "decline" && (
          <div className="flex flex-col gap-3">
            <label htmlFor={`reason-${s.id}`} className="text-sm font-semibold text-foreground">
              Reason for declining
            </label>
            <textarea
              id={`reason-${s.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. Results show a different time; not a member on the race date"
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={pending || !reason.trim()}
                onClick={() => run(() => declineSubmission(s.id, reason))}
                className="rounded-lg bg-gp-points-weak px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Declining…" : "Confirm decline"}
              </button>
              <CancelButton disabled={pending} onClick={() => setMode("idle")} />
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-3 text-sm font-medium text-gp-points-weak">
            {error}
          </p>
        )}
      </footer>
    </article>
  );
}

function CancelButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
    >
      Cancel
    </button>
  );
}

/** Shown after approving or declining, until dismissed: what changed, the
 * new record's share card if it took a #1, and the submitter's email with a
 * ready-made message to copy. Nothing is sent from here. */
function DecisionPanel({ outcome: o, onDismiss }: { outcome: DecisionOutcome; onDismiss: () => void }) {
  const approved = o.decision === "APPROVED";
  return (
    <section
      aria-label={`${approved ? "Approved" : "Declined"}: ${o.athleteName}, ${o.distanceName}`}
      className={clsx(
        "overflow-hidden rounded-xl border border-border border-t-4 bg-surface",
        approved ? "border-t-primary" : "border-t-gp-points-weak",
      )}
    >
      <header className="flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <p
            className={clsx(
              "text-xs font-semibold uppercase tracking-wide",
              approved ? "text-secondary" : "text-gp-points-weak",
            )}
          >
            {approved ? (o.newRecord ? "Approved · new club record" : "Approved") : "Declined"}
          </p>
          <h3 className="mt-0.5 text-lg font-bold text-foreground">
            {o.athleteName}{" "}
            <span className="font-medium text-muted">
              · {o.distanceName} · <span className="font-mono">{o.performance}</span>
            </span>
          </h3>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-2 shrink-0 rounded-md px-2 py-1 text-sm font-medium text-muted hover:text-foreground"
        >
          Dismiss
        </button>
      </header>

      <div
        className={clsx(
          "grid gap-5 px-5 pb-5 pt-4",
          approved && o.newRecord && "sm:grid-cols-[220px_1fr]",
        )}
      >
        {approved && o.newRecord && (
          <div className="w-full max-w-[260px] sm:max-w-none">
            <RecordCardThumb record={o.newRecord} cardUrl={`/record-card/${o.id}`} />
          </div>
        )}

        <div className="flex min-w-0 flex-col gap-4">
          {approved ? (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">What changed</h4>
              <ul className="mt-1 flex flex-col gap-0.5 text-sm font-semibold text-foreground">
                {o.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Your reason</h4>
              <p className="mt-1 text-sm text-foreground">{o.reason}</p>
            </div>
          )}

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Submitter</h4>
            <div className="mt-1 text-sm">
              <EmailWithCopy email={o.email} />
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted">Message to send</h4>
            <p className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
              {o.message}
            </p>
            <div className="mt-2">
              <CopyButton text={o.message} label="Copy message" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked (e.g. non-HTTPS) — the text is still selectable.
        }
      }}
      className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-medium text-muted hover:border-primary/50 hover:text-foreground"
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function EmailWithCopy({ email }: { email: string }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      <a href={`mailto:${email}`} className="break-all font-medium text-primary underline underline-offset-2">
        {email}
      </a>
      <CopyButton text={email} />
    </span>
  );
}

function ResultPhoto({ id }: { id: string }) {
  // HEIC photos (straight off an iPhone) only display in Safari; other
  // browsers fail to load them, so fall back to a download link.
  const [failed, setFailed] = useState(false);
  const src = `/officials/photo/${id}`;

  if (failed) {
    return (
      <p className="rounded-lg border border-border bg-background px-4 py-3 text-sm text-muted">
        This photo can&rsquo;t be shown in this browser (probably an iPhone HEIC photo).{" "}
        <a href={`${src}?download`} className="font-medium text-primary underline underline-offset-2">
          Download it
        </a>{" "}
        to view, or open this page in Safari.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      {/* eslint-disable-next-line @next/next/no-img-element -- private, session-gated image; not for next/image optimization */}
      <img
        src={src}
        alt="Photo of the submitted result"
        onError={() => setFailed(true)}
        className="max-h-[28rem] w-auto max-w-full self-start rounded-lg border border-border object-contain"
      />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-muted underline underline-offset-2 hover:text-primary"
      >
        Open full size
      </a>
    </div>
  );
}

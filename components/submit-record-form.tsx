"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { submitRecord, type SubmitField, type SubmitState } from "@/app/submit/actions";
import type { SubmitDistanceOption } from "@/lib/submissions";
import type { TimeToBeat } from "@/lib/record-highlights";
import { MAX_PHOTO_BYTES, PHOTO_ACCEPT } from "@/lib/submission-photo";
import { ToggleGroup } from "./toggle-group";

const GENDER_OPTIONS = [
  { value: "F" as const, label: "Women's" },
  { value: "M" as const, label: "Men's" },
];

const legendClass = "float-left mb-1 w-full text-xs font-semibold uppercase tracking-wide text-secondary";

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted focus:border-primary aria-[invalid=true]:border-gp-points-weak";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs font-medium text-gp-points-weak">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** The current #1 and #3 for the list the submitter has picked, read fresh
 * from the server each time the choice changes. Information only — a slower
 * time can still be submitted. */
function TimeToBeatNote({ distanceSlug, gender, ageCategory }: { distanceSlug: string; gender: "F" | "M"; ageCategory: string }) {
  const query = distanceSlug && ageCategory ? new URLSearchParams({ distance: distanceSlug, gender, ageCategory }).toString() : "";
  // Keyed by query, so a stale answer for a previous choice is never shown.
  const [lookup, setLookup] = useState<{ query: string; data: TimeToBeat | null } | null>(null);

  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();
    fetch(`/submit/time-to-beat?${query}`, { signal: controller.signal, cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<TimeToBeat>) : null))
      .then((data) => setLookup({ query, data }))
      .catch(() => {
        if (!controller.signal.aborted) setLookup({ query, data: null });
      });
    return () => controller.abort();
  }, [query]);

  if (!query) return null;
  const data = lookup?.query === query ? lookup.data : undefined;
  // A failed lookup just shows nothing — the form works without it.
  if (data === null) return null;

  let text: React.ReactNode;
  if (data === undefined) {
    text = <span className="text-muted">Checking the current records…</span>;
  } else if (!data.record) {
    text = <>No record yet for {ageCategory} — any {data.unit === "laps" ? "lap count" : "time"} makes the top 3.</>;
  } else {
    const perf = (p: string) => <span className={clsx("font-semibold", data.unit === "time" && "font-mono")}>{p}</span>;
    text = (
      <>
        Current record: {perf(data.record.performance)} ({data.record.name}).{" "}
        {data.cutoff ? (
          <>To make the top 3: beat {perf(data.cutoff)}.</>
        ) : (
          <>Fewer than 3 on the list, so any {data.unit === "laps" ? "lap count" : "time"} makes the top 3.</>
        )}
      </>
    );
  }

  return (
    <p aria-live="polite" className="rounded-md border-l-2 border-gp-gold-edge bg-gp-row-gold/60 px-2.5 py-1.5 text-xs text-foreground">
      {text}
    </p>
  );
}

const INITIAL: SubmitState = { status: "idle" };

export function SubmitRecordForm({ distances }: { distances: SubmitDistanceOption[] }) {
  const [state, formAction, pending] = useActionState(submitRecord, INITIAL);
  const [distanceSlug, setDistanceSlug] = useState("");
  const [gender, setGender] = useState<"F" | "M">("F");
  const [ageCategory, setAgeCategory] = useState("");
  // "Submit another" hides this success result and remounts the form so the
  // uncontrolled fields start empty again.
  const [dismissed, setDismissed] = useState<SubmitState | null>(null);
  const [formKey, setFormKey] = useState(0);
  // Checked as soon as a photo is picked, before anything is sent — an
  // oversized upload would otherwise be cut off by the server's body limit
  // with no friendly message.
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [photoTooBig, setPhotoTooBig] = useState(false);

  const photoError = photoTooBig ? "That photo is over 4MB. Try a screenshot or a smaller photo." : undefined;

  const distance = distances.find((d) => d.slug === distanceSlug);
  const errors: Partial<Record<SubmitField, string>> = state.status === "error" ? state.errors : {};
  const today = new Date().toISOString().slice(0, 10);

  if (state.status === "success" && dismissed !== state) {
    return (
      <div className="mt-8 rounded-xl border border-border border-t-4 border-t-gp-gold-edge bg-surface p-6">
        <h3 className="text-lg font-bold text-primary">Thanks — submission received</h3>
        <p className="mt-2 text-sm text-foreground">
          {state.athleteName}&rsquo;s {state.distanceName} has been sent to the records officer. They&rsquo;ll check
          the results link or photo and update the records page if it&rsquo;s a new club record.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-secondary"
          >
            Back to club records
          </Link>
          <button
            type="button"
            onClick={() => {
              setDismissed(state);
              setFormKey((k) => k + 1);
              setDistanceSlug("");
              setAgeCategory("");
              setPhotoName(null);
              setPhotoTooBig(false);
            }}
            className="rounded-lg border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground hover:border-primary/50"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  const aria = (field: SubmitField, id: string) => ({
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${id}-error` : `${id}-hint`,
  });

  return (
    <form
      key={formKey}
      noValidate
      // Submit via onSubmit rather than `action` so React doesn't reset the
      // fields when the server sends back validation errors.
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className="mt-8 flex flex-col gap-6 rounded-xl border border-border border-t-4 border-t-gp-gold-edge bg-surface p-5 sm:p-6"
    >
      <fieldset className="flex flex-col gap-5">
        <legend className={legendClass}>The record</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="distance" label="Distance" error={errors.distance}>
            <select
              id="distance"
              name="distance"
              value={distanceSlug}
              onChange={(e) => {
                setDistanceSlug(e.target.value);
                setAgeCategory("");
              }}
              className={inputClass}
              {...aria("distance", "distance")}
            >
              <option value="" disabled>
                Choose a distance…
              </option>
              {distances.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground">Gender</span>
            <div>
              <ToggleGroup label="Gender" options={GENDER_OPTIONS} value={gender} onChange={setGender} />
            </div>
            <input type="hidden" name="gender" value={gender} />
            {errors.gender && <p className="text-xs font-medium text-gp-points-weak">{errors.gender}</p>}
          </div>

          <Field
            id="ageCategory"
            label="Age category"
            hint={distance ? "Age on the day of the race." : "Choose a distance first."}
            error={errors.ageCategory}
          >
            <select
              // Remount on distance change so a band from another distance can't linger.
              key={distanceSlug}
              id="ageCategory"
              name="ageCategory"
              defaultValue=""
              onChange={(e) => setAgeCategory(e.target.value)}
              disabled={!distance}
              className={clsx(inputClass, "disabled:opacity-60")}
              {...aria("ageCategory", "ageCategory")}
            >
              <option value="" disabled>
                Choose…
              </option>
              {distance?.ageCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-col gap-2">
            {distance?.unit === "laps" ? (
              <Field id="performance" label="Laps completed" hint="Whole laps only." error={errors.performance}>
                <input
                  id="performance"
                  name="performance"
                  inputMode="numeric"
                  placeholder="e.g. 24"
                  className={inputClass}
                  {...aria("performance", "performance")}
                />
              </Field>
            ) : (
              <Field
                id="performance"
                label="Time"
                hint="mm:ss, or h:mm:ss if over an hour — e.g. 19:42 or 1:28:05."
                error={errors.performance}
              >
                <input
                  id="performance"
                  name="performance"
                  inputMode="numeric"
                  placeholder="h:mm:ss"
                  autoComplete="off"
                  className={clsx(inputClass, "font-mono")}
                  {...aria("performance", "performance")}
                />
              </Field>
            )}
            <TimeToBeatNote distanceSlug={distanceSlug} gender={gender} ageCategory={ageCategory} />
          </div>
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-t border-border pt-6">
        <legend className={legendClass}>The race</legend>

        <Field id="athleteName" label="Athlete name" error={errors.athleteName}>
          <input id="athleteName" name="athleteName" autoComplete="name" className={inputClass} {...aria("athleteName", "athleteName")} />
        </Field>

        <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
          <Field id="event" label="Race / event" hint="e.g. Brighton Half Marathon" error={errors.event}>
            <input id="event" name="event" className={inputClass} {...aria("event", "event")} />
          </Field>
          <Field id="date" label="Race date" error={errors.date}>
            <input id="date" name="date" type="date" max={today} className={inputClass} {...aria("date", "date")} />
          </Field>
        </div>

        <div role="group" aria-labelledby="proof-label" aria-describedby="proof-hint" className="flex flex-col gap-1.5">
          <span id="proof-label" className="text-sm font-semibold text-foreground">
            Proof of result
          </span>
          <p id="proof-hint" className="text-xs text-muted">
            The records officer uses this to verify the time. Add a link to the official results, or upload a photo
            of your result — one or the other is required.
          </p>

          <div
            className={clsx(
              "mt-1 flex flex-col gap-4 rounded-lg border bg-background p-4",
              errors.proof ? "border-gp-points-weak" : "border-border",
            )}
          >
            <Field id="resultsUrl" label="Link to official results" error={errors.resultsUrl}>
              <input
                id="resultsUrl"
                name="resultsUrl"
                type="url"
                placeholder="https://"
                className={inputClass}
                {...aria("resultsUrl", "resultsUrl")}
              />
            </Field>

            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted" aria-hidden>
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            <Field
              id="photo"
              label="Upload a photo of your result"
              hint="e.g. a screenshot of your chip time. JPG, PNG or HEIC (iPhone), up to 4MB."
              error={photoError ?? errors.photo}
            >
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={photoInput}
                  id="photo"
                  name="photo"
                  type="file"
                  accept={PHOTO_ACCEPT}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    const tooBig = !!file && file.size > MAX_PHOTO_BYTES;
                    setPhotoTooBig(tooBig);
                    if (tooBig) e.target.value = "";
                    setPhotoName(file && !tooBig ? file.name : null);
                  }}
                  className="min-w-0 flex-1 text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-primary hover:file:bg-primary-50"
                  aria-invalid={photoError || errors.photo ? true : undefined}
                  aria-describedby={photoError || errors.photo ? "photo-error" : "photo-hint"}
                />
                {photoName && (
                  <button
                    type="button"
                    onClick={() => {
                      if (photoInput.current) photoInput.current.value = "";
                      setPhotoName(null);
                    }}
                    className="text-sm font-medium text-muted underline underline-offset-2 hover:text-primary"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </Field>
          </div>
          {errors.proof && <p className="text-xs font-medium text-gp-points-weak">{errors.proof}</p>}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-5 border-t border-border pt-6">
        <legend className={legendClass}>About you</legend>

        <Field
          id="email"
          label="Your email"
          hint="Only used if the records officer has a question about this submission."
          error={errors.email}
        >
          <input id="email" name="email" type="email" autoComplete="email" className={inputClass} {...aria("email", "email")} />
        </Field>

        <div className="flex flex-col gap-1.5">
          <label className="flex items-start gap-3 rounded-lg border border-border bg-primary-50 p-3 text-sm text-foreground">
            <input
              type="checkbox"
              name="member"
              className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
              aria-invalid={errors.member ? true : undefined}
            />
            <span>
              I confirm that I, the athlete, was a paid-up active member of Peacehaven Run Club at the time of the
              event. I, the athlete listed Peacehaven Run Club as my official affiliation / club for the event, if
              applicable. I also confirm I have read the records policy to ensure my result is eligible for a record.
            </span>
          </label>
          {errors.member && <p className="text-xs font-medium text-gp-points-weak">{errors.member}</p>}
        </div>
      </fieldset>

      {state.status === "error" && (
        <p role="alert" className="rounded-lg bg-gp-row-bronze px-3 py-2 text-sm font-medium text-gp-bronze">
          Please fix the highlighted fields and try again.
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit record"}
      </button>
    </form>
  );
}

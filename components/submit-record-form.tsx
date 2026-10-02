"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { submitRecord, type SubmitField, type SubmitState } from "@/app/submit/actions";
import type { SubmitDistanceOption } from "@/lib/submissions";
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

const INITIAL: SubmitState = { status: "idle" };

export function SubmitRecordForm({ distances }: { distances: SubmitDistanceOption[] }) {
  const [state, formAction, pending] = useActionState(submitRecord, INITIAL);
  const [distanceSlug, setDistanceSlug] = useState("");
  const [gender, setGender] = useState<"F" | "M">("F");
  // "Submit another" hides this success result and remounts the form so the
  // uncontrolled fields start empty again.
  const [dismissed, setDismissed] = useState<SubmitState | null>(null);
  const [formKey, setFormKey] = useState(0);

  const distance = distances.find((d) => d.slug === distanceSlug);
  const errors: Partial<Record<SubmitField, string>> = state.status === "error" ? state.errors : {};
  const today = new Date().toISOString().slice(0, 10);

  if (state.status === "success" && dismissed !== state) {
    return (
      <div className="mt-8 rounded-xl border border-border border-t-4 border-t-gp-gold-edge bg-surface p-6">
        <h3 className="text-lg font-bold text-primary">Thanks — submission received</h3>
        <p className="mt-2 text-sm text-foreground">
          {state.athleteName}&rsquo;s {state.distanceName} has been sent to the records officer. They&rsquo;ll check
          the results link and update the records page if it&rsquo;s a new club record.
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
              onChange={(e) => setDistanceSlug(e.target.value)}
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

        <Field
          id="resultsUrl"
          label="Link to official results"
          hint="Required — the records officer uses this to verify the time."
          error={errors.resultsUrl}
        >
          <input
            id="resultsUrl"
            name="resultsUrl"
            type="url"
            placeholder="https://"
            className={inputClass}
            {...aria("resultsUrl", "resultsUrl")}
          />
        </Field>
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

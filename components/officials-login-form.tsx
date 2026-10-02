"use client";

import { useActionState } from "react";
import { logIn, type LoginState } from "@/app/officials/actions";

const INITIAL: LoginState = { error: null };

export function OfficialsLoginForm() {
  const [state, formAction, pending] = useActionState(logIn, INITIAL);

  return (
    <form action={formAction} className="mt-5 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-foreground">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "password-error" : undefined}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-primary aria-[invalid=true]:border-gp-points-weak"
        />
        {state.error && (
          <p id="password-error" role="alert" className="text-xs font-medium text-gp-points-weak">
            {state.error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary disabled:opacity-60"
      >
        {pending ? "Checking…" : "Log in"}
      </button>
    </form>
  );
}

"use client";

import { useTransition } from "react";
import type { ClientC25kWeek } from "@/lib/c25k";
import { toggleSessionComplete } from "./actions";

export function PlanView({ cohortId, weeks }: { cohortId: string; weeks: ClientC25kWeek[] }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-6 flex flex-col gap-6">
      {weeks.map((week) => (
        <div key={week.id} className="rounded-md border border-border bg-surface p-4">
          <h3 className="font-semibold">
            Week {week.weekNumber}: {week.title}
          </h3>
          {week.description && <p className="mt-1 text-sm text-muted">{week.description}</p>}

          <ul className="mt-3 flex flex-col gap-2">
            {week.sessions.map((session) => (
              <li key={session.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  id={session.id}
                  defaultChecked={session.completed}
                  disabled={isPending}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    startTransition(() => {
                      toggleSessionComplete(cohortId, session.id, checked);
                    });
                  }}
                  className="mt-1"
                />
                <label htmlFor={session.id} className="text-sm">
                  <span className="font-medium">{session.dayLabel}</span>
                  {session.description && <span className="text-muted"> — {session.description}</span>}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function timeUntil(target: Date, now: Date): { days: number; hours: number; minutes: number } | null {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) return null;
  const minutesTotal = Math.floor(diffMs / 60000);
  return {
    days: Math.floor(minutesTotal / (60 * 24)),
    hours: Math.floor((minutesTotal % (60 * 24)) / 60),
    minutes: minutesTotal % 60,
  };
}

/** Computed server-side at request time (this page already re-renders
 * fresh on every visit — see `revalidate = 0` in page.tsx) — no
 * client-side ticking needed for day-level precision, so no "use client"
 * here at all. Once the start date's passed, swaps to a plain message
 * rather than showing a negative or stuck-at-zero countdown. */
export function Countdown({ startDate }: { startDate: string }) {
  const remaining = timeUntil(new Date(startDate), new Date());

  if (!remaining) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-surface px-6 py-8 text-center">
        <p className="text-lg font-bold text-foreground">We&apos;ve started! Get in touch about the next cohort.</p>
        <a
          href="https://www.peacehavenrunclub.com/contact-us"
          className="mt-3 inline-block text-sm font-bold text-primary underline underline-offset-2"
        >
          Contact Peacehaven Run Club
        </a>
      </div>
    );
  }

  const units = [
    { label: "Days", value: remaining.days },
    { label: "Hours", value: remaining.hours },
    { label: "Minutes", value: remaining.minutes },
  ];

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-surface px-6 py-8 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-muted">Your journey starts in</p>
      <div className="mt-5 flex justify-center gap-4">
        {units.map((u) => (
          <div key={u.label} className="flex w-20 flex-col items-center rounded-xl bg-primary-50 py-4">
            <span className="text-2xl font-bold text-primary">{u.value}</span>
            <span className="mt-1.5 text-[10px] font-bold uppercase tracking-wide text-muted">{u.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";
import { getSessionRunner } from "@/lib/c25k-auth";
import { Runner } from "@/components/c25k-icons";

export const revalidate = 0;

export default async function C25kHomePage({ searchParams }: PageProps<"/c25k">) {
  const params = await searchParams;
  const hasInvalidLink = params.error === "invalid-link";
  const runner = await getSessionRunner();

  return (
    <div className="relative mx-auto flex max-w-3xl flex-col items-center overflow-hidden px-4 py-20 text-center sm:px-6">
      {/* A little trail leading off the page — the same runner-silhouette
       * motif used for the "you are here" marker and completed badges on
       * /my-plan, so the hero and the plan feel like one journey. */}
      <div aria-hidden="true" className="pointer-events-none absolute right-6 top-6 hidden h-48 w-72 opacity-80 sm:block">
        <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 420 260">
          <path
            d="M10 210 C 90 230, 130 120, 210 130 S 330 60, 410 40"
            fill="none"
            stroke="var(--color-c25k-current-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="2 16"
          />
        </svg>
        <Runner className="absolute h-6 w-6 text-primary" style={{ left: "1%", top: "74%", transform: "rotate(-12deg)" }} />
        <Runner
          className="absolute h-6 w-6 text-c25k-current-accent"
          style={{ left: "47%", top: "40%", transform: "rotate(-6deg)" }}
        />
        <Runner className="absolute h-7 w-7 text-primary" style={{ left: "92%", top: "2%", transform: "rotate(4deg)" }} />
      </div>

      {hasInvalidLink && (
        <p className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          That login link isn&apos;t valid or has expired. If you think this is a mistake, get in touch with the
          club and we&apos;ll sort you out a new one.
        </p>
      )}

      <span className="mb-5 inline-block rounded-full bg-primary-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
        9-week beginner programme
      </span>

      <h1 className="mb-4 text-5xl font-bold tracking-tight text-foreground sm:text-6xl">Couch to 5K</h1>

      <p className="mb-7 max-w-xl text-lg leading-relaxed text-muted">
        Peacehaven Run Club&apos;s Couch to 5K programme — a 9-week plan to take you from your first run to a full
        5K, three friendly sessions a week, at your own pace.
      </p>

      <div className="mb-8 flex flex-wrap justify-center gap-3">
        <span className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground">
          9 weeks
        </span>
        <span className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground">
          3 sessions a week
        </span>
        <span className="rounded-full border border-border bg-surface px-4 py-2 text-sm font-bold text-foreground">
          All paces welcome
        </span>
      </div>

      {runner ? (
        <Link
          href="/c25k/my-plan"
          className="inline-block rounded-full bg-primary px-8 py-4 text-base font-bold text-primary-foreground"
        >
          Go to my plan
        </Link>
      ) : (
        <p className="text-sm text-muted">
          Log in using the personal link from your welcome email to track your progress.
        </p>
      )}
    </div>
  );
}

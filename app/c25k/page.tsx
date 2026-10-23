import Link from "next/link";
import { getSessionRunner } from "@/lib/c25k-auth";
import { getCurrentCohort } from "@/lib/c25k";
import { Check, Flag, Lock, Runner } from "@/components/c25k-icons";
import { HeroBanner } from "./hero-banner";
import { Countdown } from "./countdown";
import { Testimonials } from "./testimonials";

export const revalidate = 0;

const WHAT_YOU_GET = [
  "A guided, week-by-week plan — no guesswork, just show up",
  "Progress tracking, so you can see how far you've come",
  "Badges that celebrate every milestone, not just the finish line",
  "The support of a real, friendly local running club",
];

// Illustrative only — not tied to any runner's actual progress. Mirrors the
// three states a real week can be in on My Plan (done / current / locked),
// reusing the same marker language, so this previews what the real
// experience actually looks like rather than inventing a different style.
const TRAIL_PREVIEW = [
  { label: "Week 1", caption: "Short walk/jog intervals", state: "done" as const },
  { label: "Week 5", caption: "Your first continuous run", state: "current" as const },
  { label: "Week 9", caption: "Graduation — your first 5K!", state: "locked" as const },
];

export default async function C25kHomePage({ searchParams }: PageProps<"/c25k">) {
  const params = await searchParams;
  const hasInvalidLink = params.error === "invalid-link";
  const [runner, cohort] = await Promise.all([getSessionRunner(), getCurrentCohort()]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-20 px-4 py-16 sm:px-6">
      {hasInvalidLink && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          That login link isn&apos;t valid or has expired. If you think this is a mistake, get in touch with the
          club and we&apos;ll sort you out a new one.
        </p>
      )}

      {/* 1. Hero */}
      <section className="flex flex-col items-center text-center">
        <span className="mb-5 inline-block rounded-full bg-primary-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-primary">
          9-week beginner programme
        </span>

        {/* photoSrc intentionally omitted — see hero-banner.tsx for how to
         * add a real club photo once one's sorted. */}
        <HeroBanner>
          <h1 className="text-4xl font-bold uppercase tracking-wide text-white sm:text-5xl">Couch to 5K</h1>
        </HeroBanner>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Whether you&apos;ve never run a step, or you&apos;re easing back in after time away, this programme meets
          you exactly where you are. Nine weeks, three sessions a week, building steadily and safely — at your own
          pace, with Peacehaven Run Club alongside you.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
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

        <div className="mt-10">
          {runner ? (
            <Link
              href="/c25k/my-plan"
              className="inline-block rounded-full bg-primary px-8 py-4 text-base font-bold text-primary-foreground"
            >
              Go to my plan
            </Link>
          ) : (
            <p className="text-sm text-muted">
              Already signed up? Log in using the personal link from your welcome email.
            </p>
          )}
        </div>
      </section>

      {/* 2. Countdown */}
      {cohort && (
        <section>
          <Countdown startDate={cohort.startDate} />
        </section>
      )}

      {/* 3. What is Couch to 5K? */}
      <section className="rounded-2xl bg-surface p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">What is Couch to 5K?</h2>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
          Couch to 5K is a 9-week programme that builds you up gradually, three short sessions a week, from
          walking and jogging in short bursts to running a full 5K — no running experience needed, whatever your
          starting point. It&apos;s run by Peacehaven Run Club, so you&apos;re never doing it alone.
        </p>

        <h3 className="mt-6 text-sm font-bold uppercase tracking-wide text-muted">What you get</h3>
        <ul className="mt-3 flex flex-col gap-2.5">
          {WHAT_YOU_GET.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary">
                <Check className="h-3 w-3" />
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* 4. What to expect — a preview, not real progress data */}
      <section>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">What to expect</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Once you join, your plan looks like a trail — each week a stop along the way, with your progress tracked
          as you go.
        </p>

        <div className="mt-6 flex items-start justify-between gap-2">
          {TRAIL_PREVIEW.map((stop, i) => (
            <div key={stop.label} className="flex flex-1 flex-col items-center text-center">
              <div className="flex w-full items-center">
                <div
                  className="h-0 flex-1 border-t-2 border-dotted border-border"
                  style={{ visibility: i === 0 ? "hidden" : "visible" }}
                />
                {stop.state === "done" && (
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-c25k-complete bg-c25k-complete text-white">
                    <Flag className="h-5 w-5" />
                  </span>
                )}
                {stop.state === "current" && (
                  <span className="relative flex h-12 w-12 flex-shrink-0 items-center justify-center">
                    <span className="absolute inset-0 rounded-full bg-c25k-current-accent/60 motion-safe:animate-ping" />
                    <span className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-c25k-current-accent bg-surface text-c25k-current">
                      <Runner className="h-5 w-5" />
                    </span>
                  </span>
                )}
                {stop.state === "locked" && (
                  <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-border bg-background text-muted">
                    <Lock className="h-5 w-5" />
                  </span>
                )}
                <div
                  className="h-0 flex-1 border-t-2 border-dotted border-border"
                  style={{ visibility: i === TRAIL_PREVIEW.length - 1 ? "hidden" : "visible" }}
                />
              </div>
              <span className="mt-2 text-sm font-bold text-foreground">{stop.label}</span>
              <span className="mt-0.5 text-xs text-muted">{stop.caption}</span>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Testimonials */}
      <section>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Hear from past runners</h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          Real stories from people who started exactly where you are now.
        </p>
        <div className="mt-6">
          <Testimonials />
        </div>
      </section>

      {/* 6. Call to action */}
      <section className="flex flex-col items-center rounded-2xl bg-surface p-8 text-center">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">Got questions, or want to join?</h2>
        <p className="mt-2 max-w-md text-sm text-muted">
          Get in touch with Peacehaven Run Club and we&apos;ll help you get started.
        </p>
        <a
          href="https://www.peacehavenrunclub.com/contact-us"
          className="mt-5 inline-block rounded-full bg-primary px-8 py-4 text-base font-bold text-primary-foreground"
        >
          Contact Us
        </a>
      </section>
    </div>
  );
}

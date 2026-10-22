import { redirect } from "next/navigation";
import { getSessionRunner } from "@/lib/c25k-auth";
import { getCurrentCohort, getPlanWithProgress, getRunnerBadges } from "@/lib/c25k";
import { PlanView } from "./plan-view";
import { logout } from "./actions";

export const revalidate = 0;

export default async function MyPlanPage() {
  const runner = await getSessionRunner();
  // There's no self-serve login page — /c25k explains how to log in (via
  // the personal link from the welcome email) and shows this message too.
  if (!runner) redirect("/c25k");

  const cohort = await getCurrentCohort();
  const [weeks, badges] = cohort
    ? await Promise.all([getPlanWithProgress(runner.id, cohort.id), getRunnerBadges(runner.id, cohort.id)])
    : [[], []];
  const firstName = runner.name.split(" ")[0];

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-5xl tracking-tight sm:text-6xl">My Plan</h2>
          <p className="mt-1 text-sm text-muted">
            {runner.name}
            {cohort && ` · ${cohort.name} cohort`}
          </p>
        </div>
        <form action={logout}>
          <button type="submit" className="text-sm font-medium text-muted hover:text-primary">
            Log out
          </button>
        </form>
      </div>

      {!cohort ? (
        <p className="mt-6 text-sm text-muted">There&apos;s no Couch to 5K cohort set up yet — check back soon.</p>
      ) : (
        <PlanView cohortId={cohort.id} weeks={weeks} firstName={firstName} badges={badges} />
      )}
    </div>
  );
}

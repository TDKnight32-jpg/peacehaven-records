import { redirect } from "next/navigation";
import { getSessionRunner } from "@/lib/c25k-auth";
import { getCurrentCohort, getPlanWithProgress } from "@/lib/c25k";
import { PlanView } from "./plan-view";
import { logout } from "./actions";

export const revalidate = 0;

export default async function MyPlanPage() {
  const runner = await getSessionRunner();
  if (!runner) redirect("/c25k/login");

  const cohort = await getCurrentCohort();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Plan</h2>
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
        <PlanView cohortId={cohort.id} weeks={await getPlanWithProgress(runner.id, cohort.id)} />
      )}
    </div>
  );
}

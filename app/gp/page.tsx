import { Suspense } from "react";
import { getGpLeaderboard, getSecondMostRecentResultsEventDate, computeMovements } from "@/lib/gp";
import { GpLeaderboard } from "@/components/gp-leaderboard";

// Same as the records hub: updated by re-running the import script directly
// against the production DB, not by redeploying.
export const revalidate = 0;

export default async function GpPage() {
  const rows = await getGpLeaderboard();

  // Movement = current standing vs. standing as of just before the latest
  // (results-bearing) event was applied.
  const priorCutoff = await getSecondMostRecentResultsEventDate();
  const priorRows = priorCutoff ? await getGpLeaderboard(priorCutoff) : [];
  // Map isn't guaranteed serializable across the server/client component
  // boundary — pass a plain object instead.
  const movements = Object.fromEntries(computeMovements(rows, priorRows));

  return (
    <Suspense fallback={null}>
      <GpLeaderboard rows={rows} movements={movements} />
    </Suspense>
  );
}

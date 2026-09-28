import { Suspense } from "react";
import {
  getGpLeaderboard,
  getSecondMostRecentResultsEventDate,
  getLatestResultsEvent,
  computeMovements,
} from "@/lib/gp";
import { buildHeadlines } from "@/lib/gp-headlines";
import { GpLeaderboard } from "@/components/gp-leaderboard";
import { GpNewsTicker } from "@/components/gp-news-ticker";

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

  // The news ticker compares the same two snapshots as the movement arrows,
  // so its headlines always agree with the table below it.
  const latest = await getLatestResultsEvent();
  const headlines = buildHeadlines({
    current: rows,
    prior: priorRows,
    latestEvent: latest && { name: latest.event.name, results: latest.results },
  });

  return (
    <>
      <GpNewsTicker headlines={headlines} />
      <Suspense fallback={null}>
        <GpLeaderboard rows={rows} movements={movements} />
      </Suspense>
    </>
  );
}

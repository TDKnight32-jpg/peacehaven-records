import { Suspense } from "react";
import { getGpLeaderboard } from "@/lib/gp";
import { SiteHeader } from "@/components/site-header";
import { GpLeaderboard } from "@/components/gp-leaderboard";

// Same as the records hub: updated by re-running the import script directly
// against the production DB, not by redeploying.
export const revalidate = 0;

export default async function GpPage() {
  const rows = await getGpLeaderboard();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={null}>
          <GpLeaderboard rows={rows} />
        </Suspense>
      </main>
    </>
  );
}

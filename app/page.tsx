import { Suspense } from "react";
import { getRecordsData } from "@/lib/records";
import { SiteHeader } from "@/components/site-header";
import { RecordsExplorer } from "@/components/records-explorer";

// Records are updated by re-running the import script directly against the
// production DB, not by redeploying — so this page must fetch fresh on every
// request rather than being frozen at build time.
export const revalidate = 0;

export default async function Home() {
  const { distances, records } = await getRecordsData();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Suspense fallback={null}>
          <RecordsExplorer distances={distances} records={records} />
        </Suspense>
      </main>
    </>
  );
}

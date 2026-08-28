import { Suspense } from "react";
import { getRecordsData } from "@/lib/records";
import { SiteHeader } from "@/components/site-header";
import { RecordsExplorer } from "@/components/records-explorer";

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

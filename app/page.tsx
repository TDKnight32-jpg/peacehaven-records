import { Suspense } from "react";
import Link from "next/link";
import { getRecordsData } from "@/lib/records";
import { SiteHeader } from "@/components/site-header";
import { RecordsExplorer } from "@/components/records-explorer";

// Records are updated by re-running the import script directly against the
// production DB, not by redeploying — so this page must fetch fresh on every
// request rather than being frozen at build time.
export const revalidate = 0;

export default async function Home() {
  const { distances, records, history } = await getRecordsData();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-5xl justify-end px-4 pt-6 sm:px-6">
          <Link
            href="/submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary"
          >
            Submit a record
          </Link>
        </div>
        <Suspense fallback={null}>
          <RecordsExplorer distances={distances} records={records} history={history} />
        </Suspense>
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-5xl justify-end px-4 py-4 sm:px-6">
          <Link href="/officials" className="text-xs text-muted hover:text-primary hover:underline">
            Records Officer Login
          </Link>
        </div>
      </footer>
    </>
  );
}

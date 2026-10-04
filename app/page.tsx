import { Suspense } from "react";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getRecordsData } from "@/lib/records";
import { SiteHeader } from "@/components/site-header";
import { RecordsExplorer } from "@/components/records-explorer";

// Records change when an official approves a submission (and the pending
// count with every submission), not on redeploy — so this page must fetch
// fresh on every request rather than being frozen at build time.
export const revalidate = 0;

export default async function Home() {
  const [{ distances, records, history }, pendingCount] = await Promise.all([
    getRecordsData(),
    // Public page: only the number is rendered, never any submission details.
    prisma.recordSubmission.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-end gap-2 px-4 pt-6 sm:px-6">
          <Link
            href="/submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-secondary"
          >
            Submit a record
          </Link>
          <Link
            href="/officials"
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-primary/50 hover:text-primary"
          >
            Records Officer Login
            {pendingCount > 0 && (
              <>
                <span
                  aria-hidden
                  className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-gp-points-weak px-1 text-[10px] font-bold leading-none text-white"
                >
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
                <span className="sr-only">
                  , {pendingCount} pending submission{pendingCount === 1 ? "" : "s"}
                </span>
              </>
            )}
          </Link>
        </div>
        <Suspense fallback={null}>
          <RecordsExplorer distances={distances} records={records} history={history} />
        </Suspense>
      </main>
    </>
  );
}

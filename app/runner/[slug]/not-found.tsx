import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { RunnerSearch } from "@/components/runner-search";
import { NameFromAddress } from "@/components/name-from-address";
import { getRunnerIndex } from "@/lib/runner-profiles";

// Shown (with a 404) for /runner/<slug> when no name on the records has that
// slug. not-found pages don't get the route's params, so the name comes
// from the address in the browser.
export default async function RunnerNotFound() {
  const runners = await getRunnerIndex();
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6">
          <Link href="/" className="text-sm font-medium text-muted hover:text-primary">
            ← Back to club records
          </Link>
          <div className="mt-6 rounded-xl border border-border border-t-4 border-t-gp-gold-edge bg-surface p-6">
            <h2 className="text-xl font-bold text-foreground">Runner not found</h2>
            <p className="mt-2 text-sm text-muted">
              We couldn&rsquo;t find a runner called <NameFromAddress /> on the club records. Try searching for them:
            </p>
            <div className="mt-4">
              <RunnerSearch runners={runners} />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

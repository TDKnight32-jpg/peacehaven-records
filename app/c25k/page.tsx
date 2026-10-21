import Link from "next/link";
import { getSessionRunner } from "@/lib/c25k-auth";

export const revalidate = 0;

export default async function C25kHomePage({ searchParams }: PageProps<"/c25k">) {
  const params = await searchParams;
  const hasInvalidLink = params.error === "invalid-link";
  const runner = await getSessionRunner();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h2 className="text-2xl font-bold">Couch to 5K</h2>
      <p className="mt-3 text-muted">
        Peacehaven Run Club&apos;s Couch to 5K programme — a 9-week plan to take you from your first run to a full
        5K, three sessions a week.
      </p>

      {hasInvalidLink && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          That login link isn&apos;t valid or has expired. If you think this is a mistake, get in touch with the
          club and we&apos;ll sort you out a new one.
        </p>
      )}

      <div className="mt-6">
        {runner ? (
          <Link
            href="/c25k/my-plan"
            className="inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go to my plan
          </Link>
        ) : (
          <p className="text-sm text-muted">
            Log in using the personal link from your welcome email to track your progress.
          </p>
        )}
      </div>
    </div>
  );
}

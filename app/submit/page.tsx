import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SubmitRecordForm } from "@/components/submit-record-form";
import { getKnownAthletes } from "@/lib/athlete-names";
import { getSubmitDistanceOptions } from "@/lib/submissions";

export const metadata: Metadata = {
  title: "Submit a Record | Peacehaven Run Club",
  description: "Think you've set a Peacehaven Run Club record? Send it in for the records officer to check.",
};

// Age-category options come from the live records, which change on import
// without a redeploy (see app/page.tsx).
export const revalidate = 0;

export default async function SubmitPage() {
  const [distances, athletes] = await Promise.all([getSubmitDistanceOptions(), getKnownAthletes()]);
  // Already public on the records page — offered as suggestions so the same
  // person is entered under the same name each time.
  const athleteNames = {
    F: athletes.filter((a) => a.gender === "F").map((a) => a.name),
    M: athletes.filter((a) => a.gender === "M").map((a) => a.name),
  };

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-6">
          <Link href="/" className="text-sm font-medium text-muted hover:text-primary">
            ← Back to club records
          </Link>
          <h2 className="mt-4 text-2xl font-bold text-foreground">Submit a record</h2>
          <p className="mt-2 text-sm text-muted">
            Think you have run a club record? Send the details below. The records officer will check
            the official results before anything appears on the records page.
          </p>
          <SubmitRecordForm distances={distances} athleteNames={athleteNames} />
        </div>
      </main>
    </>
  );
}

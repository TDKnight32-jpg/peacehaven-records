import { redirect } from "next/navigation";
import { OfficialsQueue, type QueueSubmission } from "@/components/officials-queue";
import { prisma } from "@/lib/db";
import { isOfficial } from "@/lib/officials-auth";
import { describePlacements } from "@/lib/record-approval";
import { logOut } from "./actions";

// The queue and the "would rank" context both read live data.
export const revalidate = 0;

// Dates are formatted here, on the server only, and passed to the queue as
// text. Formatting them in the client component would run Intl twice (server
// and browser), and the two ICU builds disagree on details like "Sept" vs
// "Sep" or ", " vs " at " — a hydration mismatch.
const raceDateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const submittedFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/London",
});

export default async function OfficialsQueuePage() {
  if (!(await isOfficial())) redirect("/officials/login");

  const pending = await prisma.recordSubmission.findMany({
    where: { status: "PENDING" },
    orderBy: { submittedAt: "desc" },
    include: { distance: true },
  });

  const submissions: QueueSubmission[] = await Promise.all(
    pending.map(async (s) => ({
      id: s.id,
      athleteName: s.athleteName,
      distanceName: s.distance.name,
      gender: s.gender === "F" ? "Women's" : "Men's",
      ageCategory: s.ageCategory,
      performance: s.distance.unit === "laps" ? `${s.laps} laps` : (s.time ?? ""),
      event: s.event,
      date: raceDateFormat.format(s.date),
      email: s.email,
      resultsUrl: s.resultsUrl,
      hasPhoto: s.photoUrl != null,
      submittedAt: submittedFormat.format(s.submittedAt),
      placements: await describePlacements(s),
    })),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Records officials</p>
          <h2 className="mt-1 text-2xl font-bold text-foreground">
            Pending submissions <span className="text-muted">({submissions.length})</span>
          </h2>
        </div>
        <form action={logOut} className="shrink-0">
          <button
            type="submit"
            className="whitespace-nowrap rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-muted hover:border-primary/50 hover:text-foreground"
          >
            Log out
          </button>
        </form>
      </div>
      <OfficialsQueue submissions={submissions} />
    </div>
  );
}

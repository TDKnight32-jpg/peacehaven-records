import { notFound } from "next/navigation";
import { getGpEvent, getGpLeaderboard, getPreviousResultsEventDate, computeMovements } from "@/lib/gp";
import { GpEventPage } from "@/components/gp-event-table";

export const revalidate = 0;

export default async function Page(props: PageProps<"/gp/[eventSlug]">) {
  const { eventSlug } = await props.params;
  const data = await getGpEvent(eventSlug);
  if (!data) notFound();

  // Movement = standing as of this event vs. standing as of the previous
  // (results-bearing) event chronologically — not the latest event overall.
  const eventDate = new Date(data.event.date);
  const afterRows = await getGpLeaderboard(eventDate);
  const priorEventDate = await getPreviousResultsEventDate(eventDate);
  const beforeRows = priorEventDate ? await getGpLeaderboard(priorEventDate) : [];
  const movements = Object.fromEntries(computeMovements(afterRows, beforeRows));

  return <GpEventPage event={data.event} results={data.results} movements={movements} />;
}

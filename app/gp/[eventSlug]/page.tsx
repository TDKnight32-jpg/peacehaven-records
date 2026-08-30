import { notFound } from "next/navigation";
import { getGpEvent } from "@/lib/gp";
import { SiteHeader } from "@/components/site-header";
import { GpEventPage } from "@/components/gp-event-table";

export const revalidate = 0;

export default async function Page(props: PageProps<"/gp/[eventSlug]">) {
  const { eventSlug } = await props.params;
  const data = await getGpEvent(eventSlug);
  if (!data) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <GpEventPage event={data.event} results={data.results} />
      </main>
    </>
  );
}

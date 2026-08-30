import { notFound } from "next/navigation";
import { getGpRunner } from "@/lib/gp";
import { SiteHeader } from "@/components/site-header";
import { GpRunnerPage } from "@/components/gp-runner-page";

export const revalidate = 0;

export default async function Page(props: PageProps<"/gp/runners/[runnerSlug]">) {
  const { runnerSlug } = await props.params;
  const data = await getGpRunner(runnerSlug);
  if (!data) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <GpRunnerPage
          runnerName={data.runnerName}
          results={data.results}
          leaderboardByCategory={data.leaderboardByCategory}
        />
      </main>
    </>
  );
}

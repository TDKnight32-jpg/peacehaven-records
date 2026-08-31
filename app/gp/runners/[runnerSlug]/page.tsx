import { notFound } from "next/navigation";
import { getGpRunner } from "@/lib/gp";
import { GpRunnerPage } from "@/components/gp-runner-page";

export const revalidate = 0;

export default async function Page(props: PageProps<"/gp/runners/[runnerSlug]">) {
  const { runnerSlug } = await props.params;
  const data = await getGpRunner(runnerSlug);
  if (!data) notFound();

  return (
    <GpRunnerPage
      runnerName={data.runnerName}
      results={data.results}
      leaderboardByCategory={data.leaderboardByCategory}
    />
  );
}

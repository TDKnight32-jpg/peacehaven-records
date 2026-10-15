import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { RunnerProfileView } from "@/components/runner-profile";
import { getRunnerProfile } from "@/lib/runner-profiles";

// Records change whenever an official approves a submission.
export const revalidate = 0;

export async function generateMetadata(props: PageProps<"/runner/[slug]">): Promise<Metadata> {
  const profile = await getRunnerProfile((await props.params).slug);
  const name = profile?.names.join(" / ") ?? "Runner not found";
  return {
    title: `${name} | Peacehaven Run Club Records`,
    description: profile ? `${name}'s Peacehaven Run Club records and top-3 places.` : undefined,
  };
}

export default async function RunnerPage(props: PageProps<"/runner/[slug]">) {
  const profile = await getRunnerProfile((await props.params).slug);
  if (!profile) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <RunnerProfileView profile={profile} />
      </main>
    </>
  );
}

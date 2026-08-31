import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

// Overrides the root layout's title for every /gp route. Since
// grandprix.peacehavenrunclub.com's requests are rewritten (see proxy.ts)
// to actually render pages under this layout, this is what makes the tab
// title host-aware without reading the hostname directly — Next resolves
// metadata from the rendered route tree, and grandprix's rewritten
// requests land here while records' don't.
export const metadata: Metadata = {
  title: "Club Grand Prix | Peacehaven Run Club",
  description: "Peacehaven Run Club's Club Grand Prix — leaderboard, events, and runner results.",
};

export default function GpLayout({ children }: LayoutProps<"/gp">) {
  return (
    <>
      <SiteHeader section="gp" />
      <main className="gp-theme flex-1 bg-background text-foreground">{children}</main>
    </>
  );
}

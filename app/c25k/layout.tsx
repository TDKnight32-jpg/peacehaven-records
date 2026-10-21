import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

// Overrides the root layout's title for every /c25k route — same host-aware
// trick as app/gp/layout.tsx (see the comment there for why this works
// without reading the hostname directly).
export const metadata: Metadata = {
  title: "Couch to 5K | Peacehaven Run Club",
  description: "Peacehaven Run Club's Couch to 5K programme — track your progress week by week.",
};

export default function C25kLayout({ children }: LayoutProps<"/c25k">) {
  return (
    <>
      <SiteHeader section="c25k" />
      <main className="flex-1 bg-background text-foreground">{children}</main>
    </>
  );
}

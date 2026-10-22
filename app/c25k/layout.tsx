import type { Metadata } from "next";
import { Lilita_One, Quicksand } from "next/font/google";
import { SiteHeader } from "@/components/site-header";

// Headings-only display face for the "Sunrise Start" theme (see
// app/globals.css's .c25k-theme) — loaded here, not the root layout, so it
// never ships to Records/GP pages.
const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["600", "700"],
});

// Punchier display face used for the "My Plan" page heading specifically
// (see app/c25k/my-plan/page.tsx) — not applied via .c25k-theme's heading
// rule, since Quicksand stays the face for every other heading in the
// section (week titles, the hero "Couch to 5K").
const lilitaOne = Lilita_One({
  variable: "--font-lilita",
  subsets: ["latin"],
  weight: "400",
});

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
      <main className={`c25k-theme ${quicksand.variable} ${lilitaOne.variable} flex-1 bg-background text-foreground`}>
        {children}
      </main>
    </>
  );
}

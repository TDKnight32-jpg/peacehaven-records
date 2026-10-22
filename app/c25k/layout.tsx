import type { Metadata } from "next";
import { Poppins, Work_Sans } from "next/font/google";
import { SiteHeader } from "@/components/site-header";

// The real club brand's actual typefaces (confirmed from the live site:
// Poppins Bold headings, Avenir Light body) — replaces the earlier
// Lilita One / Quicksand pairing now that C25K is aligning with the main
// brand rather than running its own distinct one. Avenir itself isn't a
// free/self-hostable font; Work Sans Light is the closest common open
// substitute (same geometric-humanist, light-weight family), used here
// until/unless a licensed Avenir is available. Both loaded here, not the
// root layout, so neither ships to Records/GP pages.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["700", "800"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
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
      <main className={`c25k-theme ${poppins.variable} ${workSans.variable} flex-1 bg-background text-foreground`}>
        {children}
      </main>
    </>
  );
}

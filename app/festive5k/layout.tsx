import type { Metadata, Viewport } from "next";
import { Alfa_Slab_One, Figtree, JetBrains_Mono } from "next/font/google";
import "./festive5k.css";

// Same host-aware trick as app/logbook/layout.tsx: festive5k.peacehavenrunclub.com
// is rewritten under /festive5k by proxy.ts, and this title applies there.
export const metadata: Metadata = {
  title: "PRC Festive 5K | Peacehaven Run Club",
  description: "Results, course records and past winners from Peacehaven Run Club's Christmas race.",
};

export const viewport: Viewport = { viewportFit: "cover", themeColor: "#0e2620" };

const alfa = Alfa_Slab_One({ weight: "400", subsets: ["latin"], variable: "--font-alfa" });
const figtree = Figtree({ weight: ["400", "500", "600", "700"], subsets: ["latin"], variable: "--font-figtree" });
const mono = JetBrains_Mono({ weight: ["500", "700"], subsets: ["latin"], variable: "--font-jbmono" });

// All styling hangs off .festive-page so it can't leak onto the other club sites.
export default function FestiveLayout({ children }: LayoutProps<"/festive5k">) {
  return <div className={`festive-page ${alfa.variable} ${figtree.variable} ${mono.variable}`}>{children}</div>;
}

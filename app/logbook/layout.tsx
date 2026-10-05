import type { Metadata, Viewport } from "next";
import { Barlow, Bowlby_One } from "next/font/google";
import "./logbook.css";

// Overrides the root layout's title for every /logbook route — same
// host-aware trick as app/gp/layout.tsx (see the comment there for why this
// works without reading the hostname directly).
export const metadata: Metadata = {
  title: "Training logbook | Peacehaven Run Club",
  description: "Pick a race, set a goal time, and get the paces to train at.",
};

// The mock-up pads for the iPhone notch/home bar (see logbook.css), which
// only kicks in with viewport-fit=cover.
export const viewport: Viewport = {
  viewportFit: "cover",
};

const bowlbyOne = Bowlby_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bowlby-one",
});

const barlow = Barlow({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow",
});

// No SiteHeader here: the logbook has its own header from the mock-up, and
// all of its styling hangs off .logbook-page so it can't reach other pages.
export default function LogbookLayout({ children }: LayoutProps<"/logbook">) {
  return <div className={`logbook-page ${bowlbyOne.variable} ${barlow.variable}`}>{children}</div>;
}

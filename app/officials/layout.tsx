import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Records Officials | Peacehaven Run Club",
  robots: { index: false, follow: false },
};

export default function OfficialsLayout({ children }: LayoutProps<"/officials">) {
  return (
    <>
      <SiteHeader homeHref="/" />
      <main className="flex-1">{children}</main>
    </>
  );
}

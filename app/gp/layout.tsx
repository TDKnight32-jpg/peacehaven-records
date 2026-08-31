import { SiteHeader } from "@/components/site-header";

export default function GpLayout({ children }: LayoutProps<"/gp">) {
  return (
    <>
      <SiteHeader section="gp" />
      <main className="gp-theme flex-1 bg-background text-foreground">{children}</main>
    </>
  );
}

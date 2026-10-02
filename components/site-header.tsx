import Image from "next/image";
import Link from "next/link";

/** `homeHref` makes the logo and title a link (e.g. back to the records page
 * from the officials area); without it they're plain text. */
export function SiteHeader({
  section = "records",
  homeHref,
}: {
  section?: "records" | "gp";
  homeHref?: string;
}) {
  const subtitle = section === "gp" ? "Club Grand Prix" : "Club Records";

  const brand = (
    <>
      <Image src="/logo.png" alt="Peacehaven Run Club" width={40} height={40} className="h-10 w-10" priority />
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted">Peacehaven Run Club</span>
        <h1 className="text-lg font-bold text-foreground group-hover:text-primary">{subtitle}</h1>
      </div>
    </>
  );

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
        {homeHref ? (
          <Link href={homeHref} className="group flex items-center gap-3">
            {brand}
          </Link>
        ) : (
          brand
        )}
        <a
          href="https://www.peacehavenrunclub.com"
          className="ml-auto hidden text-sm font-medium text-muted hover:text-primary sm:block"
        >
          peacehavenrunclub.com ↗
        </a>
      </div>
    </header>
  );
}

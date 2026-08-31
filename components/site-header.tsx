import Image from "next/image";

export function SiteHeader({ section = "records" }: { section?: "records" | "gp" }) {
  const subtitle = section === "gp" ? "Club Grand Prix" : "Club Records";

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
        <Image src="/logo.png" alt="Peacehaven Run Club" width={40} height={40} className="h-10 w-10" priority />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted">
            Peacehaven Run Club
          </span>
          <h1 className="text-lg font-bold text-foreground">{subtitle}</h1>
        </div>
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

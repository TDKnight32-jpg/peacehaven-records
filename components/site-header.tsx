import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 sm:px-6">
        <Image src="/logo.png" alt="Peacehaven Run Club" width={40} height={40} className="h-10 w-10" priority />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold uppercase tracking-wide text-muted">
            Peacehaven Run Club
          </span>
          <h1 className="text-lg font-bold text-foreground">Club Records</h1>
        </div>
        <nav className="ml-4 flex gap-4">
          <Link href="/" className="text-sm font-medium text-muted hover:text-primary">
            Records
          </Link>
          <Link href="/gp" className="text-sm font-medium text-muted hover:text-primary">
            Grand Prix
          </Link>
        </nav>
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

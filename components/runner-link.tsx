import Link from "next/link";
import { slugify } from "@/lib/slug";

/** An athlete's name on the records, linking to their runner profile. */
export function RunnerLink({ name, className }: { name: string; className?: string }) {
  return (
    <Link
      href={`/runner/${slugify(name)}`}
      className={`${className ?? ""} underline-offset-2 hover:text-primary hover:underline`}
    >
      {name}
    </Link>
  );
}

"use client";

import { usePathname } from "next/navigation";

/** The name in a /runner/<slug> address, in words ("sam-barden" → "sam barden"),
 * for the runner not-found page, which doesn't get the route's params. */
export function NameFromAddress() {
  const slug = decodeURIComponent(usePathname().split("/").pop() ?? "");
  return <span className="font-semibold text-foreground">&ldquo;{slug.replace(/-+/g, " ").trim()}&rdquo;</span>;
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// records.peacehavenrunclub.com, grandprix.peacehavenrunclub.com,
// c25k.peacehavenrunclub.com, logbook.peacehavenrunclub.com and
// festive5k.peacehavenrunclub.com all point at
// this same app. Records is the site's literal root (no rewrite needed);
// Grand Prix, Couch to 5K, and the Training logbook each have their own
// pages living under /gp, /c25k, and /logbook respectively, so on those
// hosts every path is transparently rewritten under the matching prefix —
// the URL bar keeps showing the path the visitor typed/clicked, they just
// get that section's content for it.
const HOST_PREFIXES: Record<string, string> = {
  "grandprix.peacehavenrunclub.com": "/gp",
  "c25k.peacehavenrunclub.com": "/c25k",
  "logbook.peacehavenrunclub.com": "/logbook",
  "festive5k.peacehavenrunclub.com": "/festive5k",
};

export function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0];
  const prefix = HOST_PREFIXES[hostname];

  if (prefix && !request.nextUrl.pathname.startsWith(prefix)) {
    const url = request.nextUrl.clone();
    url.pathname = `${prefix}${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};

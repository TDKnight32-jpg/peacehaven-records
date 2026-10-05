import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// records.peacehavenrunclub.com, grandprix.peacehavenrunclub.com, and
// logbook.peacehavenrunclub.com all point at this same app. Records is the
// site's literal root (no rewrite needed); Grand Prix's own pages all live
// under /gp and the Training logbook's under /logbook, so on those hosts
// every path is transparently rewritten under the matching prefix — the URL
// bar keeps showing the path the visitor typed/clicked, they just get that
// section's content for it.
const GP_HOSTS = new Set(["grandprix.peacehavenrunclub.com"]);
const LOGBOOK_HOSTS = new Set(["logbook.peacehavenrunclub.com"]);

export function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0];

  if (GP_HOSTS.has(hostname) && !request.nextUrl.pathname.startsWith("/gp")) {
    const url = request.nextUrl.clone();
    url.pathname = `/gp${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (LOGBOOK_HOSTS.has(hostname) && !request.nextUrl.pathname.startsWith("/logbook")) {
    const url = request.nextUrl.clone();
    url.pathname = `/logbook${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};

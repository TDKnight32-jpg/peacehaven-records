import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Both records.peacehavenrunclub.com and grandprix.peacehavenrunclub.com
// point at this same app. Records is the site's literal root (no rewrite
// needed); Grand Prix's own pages all live under /gp, so on that host every
// path is transparently rewritten under /gp — the URL bar keeps showing the
// path the visitor typed/clicked, they just get /gp's content for it.
const GP_HOSTS = new Set(["grandprix.peacehavenrunclub.com"]);

export function proxy(request: NextRequest) {
  const hostname = (request.headers.get("host") ?? "").split(":")[0];

  if (GP_HOSTS.has(hostname) && !request.nextUrl.pathname.startsWith("/gp")) {
    const url = request.nextUrl.clone();
    url.pathname = `/gp${request.nextUrl.pathname}`;
    return NextResponse.rewrite(url);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png).*)"],
};

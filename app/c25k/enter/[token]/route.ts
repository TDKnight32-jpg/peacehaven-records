import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authenticateWithToken } from "@/lib/c25k-auth";

export async function GET(request: NextRequest, ctx: RouteContext<"/c25k/enter/[token]">) {
  const { token } = await ctx.params;
  const runner = await authenticateWithToken(token);

  // Pages always live under /c25k regardless of host — see the HOST_PREFIXES
  // comment in proxy.ts (same reasoning as /gp).
  const destination = runner ? "/c25k/my-plan" : "/c25k?error=invalid-link";

  return NextResponse.redirect(new URL(destination, request.url));
}

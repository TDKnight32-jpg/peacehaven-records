import { cookies } from "next/headers";
import { prisma } from "./db";
import type { Runner } from "@prisma/client";

export const SESSION_COOKIE_NAME = "c25k_session";

// ~12 weeks — comfortably covers the 9-week plan plus some buffer. This is
// the cookie's own lifetime, not an expiry on the underlying token: a
// CohortRunner's token never expires on its own, so revisiting the personal
// /enter/[token] link just renews the cookie for another 12 weeks.
const SESSION_TTL_MS = 12 * 7 * 24 * 60 * 60 * 1000;

// Cookies set here need to work whether a visitor is on
// c25k.peacehavenrunclub.com (canonical) or records.peacehavenrunclub.com/c25k
// (proxy.ts rewrites both to the same pages) — sharing the apex domain in
// production lets one login cookie cover both. Left unset in dev, where
// there's no shared apex to scope to.
function cookieDomain(): string | undefined {
  return process.env.NODE_ENV === "production" ? ".peacehavenrunclub.com" : undefined;
}

/**
 * Looks up a runner's personal login token (from their /enter/[token] link)
 * and, if it matches a CohortRunner enrollment, logs them in by setting the
 * session cookie. Returns the runner, or null if the token doesn't match
 * anything — the caller should show a friendly "invalid link" message
 * rather than an error in that case.
 */
export async function authenticateWithToken(token: string): Promise<Runner | null> {
  const enrollment = await prisma.cohortRunner.findUnique({ where: { token }, include: { runner: true } });
  if (!enrollment) return null;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    domain: cookieDomain(),
    expires: new Date(Date.now() + SESSION_TTL_MS),
  });

  return enrollment.runner;
}

/** Reads the session cookie and returns the logged-in Runner, or null. */
export async function getSessionRunner(): Promise<Runner | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const enrollment = await prisma.cohortRunner.findUnique({ where: { token }, include: { runner: true } });
  return enrollment?.runner ?? null;
}

/** Clears the session cookie. The underlying token still works — logging
 * back in is just a matter of revisiting the same personal link. */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete({ name: SESSION_COOKIE_NAME, path: "/", domain: cookieDomain() });
}

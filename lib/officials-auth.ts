import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// The officials' review area (/officials) is behind one shared password,
// OFFICIALS_PASSWORD — no per-person accounts. Logging in sets a signed,
// expiring cookie; the signature is keyed on the password itself, so
// changing OFFICIALS_PASSWORD logs everyone out.

const COOKIE_NAME = "officials_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// Covers the pages, the photo route and the server actions, which all live
// under /officials.
const COOKIE_PATH = "/officials";

function password(): string | null {
  return process.env.OFFICIALS_PASSWORD || null;
}

function sign(expires: number, key: string): string {
  return createHmac("sha256", key).update(`officials:${expires}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function isOfficialsAreaConfigured(): boolean {
  return password() !== null;
}

/** Checks the password and, if right, starts a session. */
export async function logInOfficial(attempt: string): Promise<boolean> {
  const key = password();
  if (!key || !safeEqual(attempt, key)) return false;

  const expires = Date.now() + SESSION_TTL_MS;
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, `${expires}.${sign(expires, key)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: COOKIE_PATH,
    expires: new Date(expires),
  });
  return true;
}

/** Whether this request carries a valid, unexpired officials session.
 * Every officials page, action and the photo route must check this
 * themselves — there's no blanket gate in proxy.ts. */
export async function isOfficial(): Promise<boolean> {
  // Read the cookie before anything else: that's what marks the calling page
  // as per-request. Bailing out first (e.g. when OFFICIALS_PASSWORD is unset
  // at build time) would let Next prerender the login page as static.
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  const key = password();
  if (!key || !value) return false;

  const [expiresRaw, signature] = value.split(".");
  const expires = Number(expiresRaw);
  if (!Number.isFinite(expires) || expires < Date.now() || !signature) return false;
  return safeEqual(signature, sign(expires, key));
}

export async function logOutOfficial(): Promise<void> {
  (await cookies()).delete({ name: COOKIE_NAME, path: COOKIE_PATH });
}

/** Trims, lowercases, and collapses runs of whitespace — for matching
 * hand-typed strings (event names, runner names) across sheet tabs where
 * incidental spacing/case shouldn't cause a mismatch. Does not fix genuine
 * spelling differences. */
export function normalizeWhitespace(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

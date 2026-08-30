import { normalizeWhitespace } from "./text";

/** Collapses whitespace/case differences so hand-typed name variants across
 * race tabs ("Tom Smith", " tom  smith") resolve to the same Runner during
 * import. Does not fix genuine spelling variants (e.g. "Tom" vs "Thomas") —
 * those still need a manual merge if they occur. */
export function normalizeRunnerName(raw: string): string {
  return normalizeWhitespace(raw);
}

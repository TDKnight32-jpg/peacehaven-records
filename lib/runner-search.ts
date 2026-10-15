import { levenshteinDistance } from "./text";

// Matching for the records page's "Find a runner" box. Looser than the
// record lists (which match names exactly — see placeInList): it only
// suggests names, and the profile itself is found by the exact name's slug.

export interface RunnerSuggestion {
  name: string;
  /** For /runner/<slug>. */
  slug: string;
  /** e.g. "3 top-3 places" or "Former record holder". */
  summary: string;
}

/** Lower case, accents dropped, and anything that isn't a letter or digit
 * (hyphens, apostrophes, extra spaces) turned into single spaces — so
 * "Ann-Grace" and "ann  grace" compare equal. */
export function searchKey(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** How well one typed word matches a name: 3 for the start of a word in it,
 * 2 for part of one (or of the whole name run together, so "anngrace"
 * works), 1 for a one-letter slip in a longer word ("woller" for
 * "wooller"), 0 for no match. */
function wordMatch(word: string, nameWords: string[], compact: string): number {
  if (nameWords.some((w) => w.startsWith(word))) return 3;
  if (compact.includes(word) || nameWords.some((w) => w.includes(word))) return 2;
  if (word.length >= 4 && nameWords.some((w) => levenshteinDistance(word, w.slice(0, word.length + 1)) <= 1)) return 1;
  return 0;
}

/**
 * Names matching what's been typed, best first. Every typed word is looked
 * for in the name, in any order; a name matching only some of them is still
 * suggested (below those matching all) as long as a matched word is 3+
 * letters, so an old or misremembered surname — "Wooller Smith" — still
 * finds Lucy Wooller, but "Sam b" doesn't list everyone with a "b".
 */
export function matchRunners(query: string, runners: RunnerSuggestion[], limit = 8): RunnerSuggestion[] {
  const words = searchKey(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];

  const scored = runners.flatMap((r) => {
    const key = searchKey(r.name);
    const nameWords = key.split(" ");
    const compact = nameWords.join("");
    const matches = words.map((w) => wordMatch(w, nameWords, compact));
    const matched = matches.filter((m) => m > 0).length;
    if (matched === 0) return [];
    if (matched < words.length && !words.some((w, i) => matches[i] > 0 && w.length >= 3)) return [];
    const score = matched * 10 + matches.reduce((a, b) => a + b, 0) + (key.startsWith(words[0]) ? 1 : 0);
    return [{ r, score }];
  });
  return scored
    .sort((a, b) => b.score - a.score || a.r.name.localeCompare(b.r.name))
    .slice(0, limit)
    .map((s) => s.r);
}

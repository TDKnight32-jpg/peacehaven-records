export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Appends -2, -3, ... to `base` until it's not in `taken`, then reserves it. */
export function uniqueSlug(base: string, taken: Set<string>): string {
  const root = slugify(base) || "entry";
  let candidate = root;
  let n = 2;
  while (taken.has(candidate)) {
    candidate = `${root}-${n}`;
    n++;
  }
  taken.add(candidate);
  return candidate;
}

import { parse } from "csv-parse/sync";

export interface ParsedC25kRunner {
  name: string;
  email: string;
}

/**
 * The real sheet's exact header text isn't known yet (built ahead of the
 * sheet being shared — see scripts/c25k-sheet-config.ts) so headers are
 * matched by alias, case/whitespace-insensitively, rather than hardcoded
 * column indexes — same approach as lib/gp-csv-parser.ts.
 */
function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["full name", "name", "runner name"],
  email: ["email", "email address", "e mail"],
};

function resolveColumns(header: string[], warnings: string[]): Record<string, number> {
  const normalized = header.map(normalizeHeader);
  const resolved: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    const idx = normalized.findIndex((h) => aliases.includes(h));
    if (idx === -1) {
      warnings.push(`no column matched for "${field}" (tried: ${aliases.join(", ")})`);
    } else {
      resolved[field] = idx;
    }
  }
  return resolved;
}

function cell(row: string[], col: number | undefined): string {
  if (col === undefined) return "";
  const v = row[col];
  return v === undefined || v === null ? "" : String(v).trim();
}

/**
 * Parses the C25K runner-list tab: one row per runner to enrol, with "Full
 * name" and "Email" columns. A wholly blank row is skipped silently; a row
 * with only one of the two values is reported as a warning (normally a
 * sheet typo) rather than silently dropped. Email is lower-cased here so
 * every caller matches/stores it consistently.
 */
export function parseRunnersTab(csvText: string, warnings: string[]): ParsedC25kRunner[] {
  const rows: string[][] = parse(csvText, { relax_column_count: true, skip_empty_lines: true });
  if (rows.length === 0) return [];

  const [header, ...body] = rows;
  const columns = resolveColumns(header, warnings);

  const runners: ParsedC25kRunner[] = [];
  for (const [i, row] of body.entries()) {
    const name = cell(row, columns.name);
    const email = cell(row, columns.email);
    if (!name && !email) continue; // blank row

    if (!name || !email) {
      warnings.push(`row ${i + 2}: missing ${!name ? "name" : "email"} (name="${name}", email="${email}")`);
      continue;
    }

    runners.push({ name, email: email.toLowerCase() });
  }
  return runners;
}

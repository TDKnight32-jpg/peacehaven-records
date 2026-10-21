# Peacehaven Run Club — Club Records

Next.js + Prisma/Postgres site for browsing the club's age-group and overall records, imported from the [club's records spreadsheet](https://docs.google.com/spreadsheets/d/e/2PACX-1vSFnaq0-Sg-b0RvsZJXdJh-0h1TdpqGoz89_K8pfXnr51Z9CkeXH0vDGk0xsXTgx3QzEs_v1-n-Hll5/pub?output=csv&gid=1959397949). Live at https://peacehaven-records.vercel.app.

## Setup

```bash
npm install
npx vercel link                                        # first time only — links this folder to the Vercel project
npx vercel env pull .env.local --environment=preview    # pulls DATABASE_URL etc.
cp .env.local .env                                      # Prisma CLI and the import script read .env, not .env.local
```

## Preview locally

```bash
npm run dev
```

Open http://localhost:3000. This runs against the same production database, so it shows real data.

## Update the site with new records from the spreadsheet

The importer re-fetches the published CSV, parses it, and runs sanity checks — it never writes to the database on its own.

```bash
npm run import                # dry run: parses + sanity-checks + writes scripts/import-report.json
```

Review `scripts/import-report.json` (counts per distance/category, sample rows) against what changed in the spreadsheet. If it looks right:

```bash
npm run import -- --write     # writes the parsed records to the database
```

The site reads fresh on every request, so changes appear immediately — no redeploy needed.

## Club Grand Prix

Same idea as club records, imported from a separate Google Sheet with one "Events" tab and one tab per race. Fill in `scripts/gp-sheet-config.ts` with the sheet's publish-to-CSV base URL, the Events tab's `gid`, and each race tab's `{ name, gid }` (name must match that race's row in the Events tab) before running:

```bash
npm run import-gp                # dry run: parses + sanity-checks + writes scripts/import-gp-report.json
npm run import-gp -- --write     # writes events, runners, and results; removes results no longer in the sheet + orphaned runners
npm run backup-db                # snapshot every table to backups/ (gitignored) before risky changes
```

Runners are matched across tabs by normalized name (case/whitespace-insensitive) so hand-typed variants collapse onto one runner rather than creating duplicates — genuine spelling variants (e.g. a nickname) still need a manual fix.

## Couch to 5K

A 9-week programme runners can log into and tick off session by session, at `/c25k` (served as the homepage on c25k.peacehavenrunclub.com). There's no signup flow or password — each runner gets a personal, long-life login link (`/enter/<token>`) that logs them straight in and sets a session cookie good for ~12 weeks (long enough to cover the whole programme). Visiting an unrecognized or stale link shows a friendly message rather than an error.

The 9-week plan content and cohorts live in the database, not a spreadsheet:

```bash
npm run seed-c25k    # idempotent — (re-)seeds the shared 9-week plan content and a starter cohort
```

Add a Cohort (if needed) via Prisma Studio (`npx prisma studio`) first — there's no importer for that part yet. Then enrol runners into the current (most recently started, or soonest upcoming) cohort from a Google Sheet with two columns, "Full name" and "Email". Fill in `scripts/c25k-sheet-config.ts` with the sheet's publish-to-CSV base URL and the tab's `gid` before running:

```bash
npm run import-c25k-runners                # dry run: parses + sanity-checks + prints a summary
npm run import-c25k-runners -- --write     # creates new runners and enrolls everyone into the cohort
```

Runners are matched by email — an existing Runner (e.g. one with race results but no prior C25K enrollment) is reused rather than duplicated, and a row for someone already enrolled in the cohort is skipped rather than creating a second enrollment.

Once enrolled, run `npm run generate-links` to print every enrolled runner's name and personal login link for the current cohort, ready to paste into a welcome email you send manually.

## Deploy

Pushing to `main` on GitHub triggers an automatic Vercel deployment.

```bash
git add -A
git commit -m "..."
git push
```

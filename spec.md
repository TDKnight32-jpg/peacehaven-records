# Peacehaven Run Club — Records Site

## What I'm building
A website to store, showcase, and manage Peacehaven Run Club's club records — similar in spirit to https://records.eastbourneroversac.co.uk

## Data source
Import records from this published Google Sheet (CSV export):
https://docs.google.com/spreadsheets/d/e/2PACX-1vSFnaq0-Sg-b0RvsZJXdJh-0h1TdpqGoz89_K8pfXnr51Z9CkeXH0vDGk0xsXTgx3QzEs_v1-n-Hll5/pub?output=csv&gid=1959397949

The sheet has two record types per distance:
1. **Age-group records** — split by gender (Men's / Women's), then by age category (Under 40, 40-49, 50-59, 60-69, 70-Over)
2. **Overall records** — the single fastest time per distance per gender, regardless of age

Distances covered: 1 mile (road), 5K, 10K, 10 mile, Half Marathon, 20 mile, Marathon, 50KM, 50 mile, 100KM, 100 mile, Back Yard Ultra (measured in laps, not time).

Each record has: category, name, time (or laps), event/location, date. Some slots are empty (no record set yet) — the site must handle these gracefully, not show blank/broken rows. Some entries have footnote markers (e.g. gun-timed events, distance clarifications) — preserve these as a small note/tooltip rather than dropping them.

## Core features (MVP)
1. **Import script** — parse the CSV above into a proper database (one-time import to start; re-runnable later).
2. **Records hub page** — browse by distance, with tabs/filters for:
   - Men's / Women's / All
   - Age-group records vs Overall records
3. **Search** — filter by name or event/distance.
4. **Responsive design** — must look good on mobile, since most club members will check it on their phones.
5. **Empty states** — distances/categories with no record yet should show "No record set" rather than a blank row.

## Phase 2 (once MVP works)
1. **Admin login** — a simple authenticated area where committee members can add/edit/delete records without touching code or the spreadsheet.
2. **Record history** — some distances already track a history of who's held the record over time (visible in the sheet's "records history" columns) — surface this as an optional expandable view per distance.
3. **Automatic overall-record detection** — when an age-group time beats the current overall record, flag it (age-group records can supersede overall records).

## Suggested stack
- Next.js (React) for the frontend — good default, easy to deploy
- SQLite (via Prisma) for the database — simple, no external service needed for a club-sized site
- Deploy target: Vercel (free tier is enough for this traffic level)

## Branding
Club name: Peacehaven Run Club. Existing site: https://www.peacehavenrunclub.com (built on Wix). Match its tone where practical — friendly, community-focused running club based in Peacehaven, affiliated with England Athletics and Arc. Logo is visible at the top of the existing site if I need to pull it in. Otherwise use a clean, neutral running-club look.

## Design direction
Should feel like part of the same club as the Wix site, not a totally separate product — but more modern in execution. Specifically:
- Pull the same core brand colors, logo, and general tone from the live Wix site (https://www.peacehavenrunclub.com) as a starting point.
- Modernize from there: cleaner typography, more whitespace, flat card-based layouts instead of Wix's stacked-block style, no dated design patterns (heavy drop shadows, cluttered image grids).
- Mobile-first — most members will check this on their phones.
- Overall goal: someone clicking through from the Wix site should feel like they're still on the club's site, just landing on the newer, nicer part of it.

## Brand assets
- Primary color: [hex code]
- Accent/secondary color: [hex code]
- Logo file: [path to logo file once saved into the project, e.g. /public/logo.png]

## Integrating with the existing Wix site
This new site is NOT replacing the Wix site — it's a separate app that sits alongside it. The existing Wix site already has a "Club Records" page at https://www.peacehavenrunclub.com/clubrecords, which currently just links out or embeds static content — this project replaces what's behind that link with the real, filterable, database-backed version.

Integration plan once deployed:
1. Deploy this app to Vercel — get a working `.vercel.app` URL.
2. Set up a subdomain, e.g. `records.peacehavenrunclub.com`, pointed at the Vercel deployment via DNS (CNAME record) — this needs access to wherever the peacehavenrunclub.com domain is managed (likely Wix's domain settings, or wherever it was originally registered).
3. Update the existing "Club Records" link/page on the Wix site so it points to `records.peacehavenrunclub.com` instead of whatever it currently shows.

No changes to the rest of the Wix site are needed — this is purely additive.

## What I want to happen first
1. Set up the project structure and Next.js app
2. Write the CSV import script and get all current records loaded into the database
3. Build the records hub page (browse + filter + search) using that data
4. Show me a local preview before we touch admin/auth features

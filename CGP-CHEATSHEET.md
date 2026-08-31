# Club Grand Prix — Update Cheatsheet

Step-by-step for updating Grand Prix results from the terminal, without needing Claude Code. (There's no separate cheatsheet for the club records side yet — this mirrors the style of the "Update the site" section in `README.md`.)

One-time setup (env vars, `npm install`) is covered in `README.md` — this assumes that's already done.

## Updating results after a race

1. **Enter the race's results into the Google Sheet first.** Make sure the tab name matches the event's name in the "Events" tab exactly, and the columns are Runner / Category / Result / Raw time / Predicted time / Position / Points / Volunteer.

2. **Dry run:**

   ```bash
   npm run import-gp
   ```

   This only *reads* the sheet and the database — it never writes anything. Watch the terminal output.

3. **A clean run ends with:**

   ```
   Sanity checks passed.
   Parsed 16 events, 245 results.
   Report written to /path/to/scripts/import-gp-report.json

   Dry run only — no database writes made. Review the report, then re-run with --write.
   ```

   If you want to double-check the numbers, open `scripts/import-gp-report.json` — it lists every event with its result count.

4. **If it looks clean, write it for real:**

   ```bash
   npm run import-gp -- --write
   ```

   That's it — no git commit, no push, no deploy. This writes straight to the live database, and the site (`/gp`) shows the update immediately.

5. **Spot-check the live site** — open `/gp` and the event's page, confirm the new results are there.

## When to come back to Claude Code instead

The dry run is designed to fail loudly rather than let something questionable through. If you see any of these, stop and ask Claude Code rather than pushing through:

- **`Import sanity check failed (...)` with a list of issues** — could be a genuine data problem in the sheet (missing date, unrecognized scoring type, a race tab that doesn't match an Events-tab row). Read the list; if it's not an obvious typo you can fix in the sheet yourself, bring it to Claude Code.
- **A runner's name was corrected/typo-fixed in the sheet.** The importer matches runners by name — if the *old* spelling was already used in a previous week, fixing the new spelling can silently create a **second, duplicate runner record** splitting that person's history in two. This has happened before (e.g. "Geoge Isaacs" vs "George Isaacs", "Sam Barden" vs "Samantha Barden") — the importer doesn't always catch it automatically, especially when both spellings were already used in different tabs before the fix. Have Claude Code re-run the dry run and check for this before you write.
- **Merging two runner records.** There's a `--merge-runners <keep-slug> <merge-slug>` command for this, but a wrong merge corrupts two people's histories and isn't easily undone — do this with Claude Code, not solo.
- **A network error from the sheet fetch** (`ETIMEDOUT`, `fetch failed`, a `400`/`headers timeout`, etc.) is usually just Google's CSV endpoint being slow — retry `npm run import-gp` a couple of times first. If it keeps failing, that's worth a second pair of eyes.
- **A new season, or a new race added mid-season that isn't in the sheet config yet.** `scripts/gp-sheet-config.ts` lists every race tab's name and `gid` by hand — adding an event means adding it there too. Have Claude Code update it rather than hand-editing, since a mismatched name silently orphans that tab's results.

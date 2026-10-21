/**
 * `C25K_RUNNERS_SHEET_PUBLISH_BASE` is the doc's publish-to-CSV URL up to
 * (not including) the `&gid=` — same "2PACX-..." id the club-records and
 * Grand Prix importers use (File > Share > Publish to web > CSV, in the
 * Google Sheet). `RUNNERS_TAB_GID` is that tab's `gid` from its URL when
 * selected in the sheet (the number after `#gid=`).
 *
 * The tab needs exactly two columns: "Full name" and "Email".
 */

export const C25K_RUNNERS_SHEET_PUBLISH_BASE = "REPLACE_WITH_PUBLISH_TO_CSV_BASE_URL";

export const RUNNERS_TAB_GID = "REPLACE_WITH_TAB_GID";

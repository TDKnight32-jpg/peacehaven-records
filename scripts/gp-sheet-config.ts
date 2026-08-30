/**
 * `GP_SHEET_PUBLISH_BASE` is the doc's publish-to-CSV URL up to (not
 * including) the `&gid=` — same "2PACX-..." id the existing club-records
 * importer uses (File > Share > Publish to web > CSV, in the Google Sheet).
 * `EVENTS_TAB_GID` and each entry in `RACE_TABS` are the per-tab `gid` from
 * that tab's URL when selected in the sheet (the number after `#gid=`).
 *
 * `RACE_TABS[].name` must match that race's `name` in the Events tab exactly
 * (case-insensitive) — the importer uses it to look up which event a tab's
 * results belong to. Some tabs below are for events that haven't happened
 * yet and have no result rows — the importer handles those gracefully
 * (zero results, no error) rather than treating an empty tab as a problem.
 */

export const GP_SHEET_PUBLISH_BASE =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSh1UguAEup7MMwGyMGDK1Ahf_D7TZlVUKXv9reuNZVYJHa_v1wQ0ArN3ppPn-Bly4fLoal2b5ehCcV/pub?output=csv";

export const EVENTS_TAB_GID = "0";

export const RACE_TABS: { name: string; gid: string }[] = [
  { name: "Peacehaven parkrun", gid: "1286663344" },
  { name: "Whitbread Hollow (XC)", gid: "1932807685" },
  { name: "Brighton Half Marathon", gid: "1382421716" },
  { name: "Downs link parkrun", gid: "1344901133" },
  { name: "Haywards Heath 10 mile", gid: "345629455" },
  { name: "Heathfield 10k", gid: "1984603545" },
  { name: "Peacehaven Run Club Summer Solstice", gid: "1616244330" },
  { name: "Eastbourne parkrun", gid: "523116830" },
  { name: "Tilgate parkrun", gid: "850369848" },
  { name: "Henfield Half Marathon", gid: "1349492902" },
  { name: "Seaford Beach parkrun", gid: "2117055748" },
  { name: "Hellingly 10k", gid: "1651890069" },
  { name: "Clair parkrun", gid: "205553052" },
  { name: "Crowborough 10k", gid: "723192152" },
  { name: "Mince Pie 10 Miler", gid: "114865465" },
  { name: "Peacehaven Run Club Festive 5k", gid: "1910660964" },
];

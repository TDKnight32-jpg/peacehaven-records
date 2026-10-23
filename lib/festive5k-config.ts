// PRC Festive 5K — settings Tommy may need to change.
//
// FESTIVE_5K_SHEET_CSV: the "Festive 5k results database" Google Sheet,
// published as CSV (in the sheet: File > Share > Publish to web > Sheet1 >
// Comma-separated values). The site re-reads it at most once a minute, so on
// race day new rows show up on the board within about a minute.
//
// Columns (row 1 headers): Year, Name, Gender, Age, Time, Bib No, Guest, Notes
export const FESTIVE_5K_SHEET_CSV =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSVN5f0dk0BHy32wtfYGXJlNbwn99iRWxMuHtuQIQpucD59W4ItIJQyLrac6kMoQ5o9pr4BvgdsoBxr/pub?gid=0&single=true&output=csv";

// Next race. Month is 1-12 here. Change this each year.
export const FESTIVE_5K_NEXT_RACE = { year: 2026, month: 12, day: 20 };

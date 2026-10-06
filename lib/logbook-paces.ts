// Training logbook maths — a straight port of the formulas in the
// training-logbook.html mock-up. Paces come from the Daniels and Gilbert
// running formulas: the goal race gives a "pace score" (VDOT), and each
// training zone is that score scaled to a % effort, turned back into a speed.
// Everything below keeps the mock-up's constants and rounding exactly; Fast
// reps (predicted 800m race pace), the 1500m, mile, 3K and 5 mile races, and
// 400m lap splits were added after the mock-up.

// Shortest to longest; this is also the order of the distance buttons.
// Track races (laps) show their splits every 400m. record is the world
// record in seconds, for the "quicker than the world record" check (see
// calculateLogbook).
export const DISTANCES = {
  "1500m": { m: 1500, name: "1500m", label: "1500m", laps: true, record: 206 },
  mile: { m: 1609.344, name: "mile", label: "1 mile", laps: true, record: 223.13 },
  "3k": { m: 3000, name: "3K", label: "3K", laps: true, record: 440.67 },
  "5k": { m: 5000, name: "5K", label: "5K" },
  "5mi": { m: 8046.72, name: "5 miles", label: "5 miles" },
  "10k": { m: 10000, name: "10K", label: "10K" },
  "10mi": { m: 16093.44, name: "10 miles", label: "10 miles" },
  half: { m: 21097.5, name: "half marathon", label: "Half marathon" },
  mar: { m: 42195, name: "marathon", label: "Marathon" },
} as const;

export type DistanceKey = keyof typeof DISTANCES;
export type PaceUnit = "km" | "mi";

const MILE = 1609.344;

// Daniels and Gilbert formulas. v is metres per minute, t is minutes.
function vo2(v: number) {
  return -4.6 + 0.182258 * v + 0.000104 * v * v;
}
function pct(t: number) {
  return 0.8 + 0.1894393 * Math.exp(-0.012778 * t) + 0.2989558 * Math.exp(-0.1932605 * t);
}
function scoreFor(d: number, t: number) {
  return vo2(d / t) / pct(t);
}
function vAt(o: number) {
  return (-0.182258 + Math.sqrt(0.182258 * 0.182258 + 4 * 0.000104 * (o + 4.6))) / (2 * 0.000104);
}
// Predicted race speed over distance d for a pace score: searches for the
// finish time (between lo and hi minutes) that gives that same score.
function raceV(d: number, lo: number, hi: number, score: number) {
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (scoreFor(d, mid) > score) lo = mid;
    else hi = mid;
  }
  return d / ((lo + hi) / 2);
}
function marathonV(score: number) {
  return raceV(42195, 100, 700, score);
}
// 1 to 15 minutes comfortably covers every 800m time for scores 20 to 86.
function eightHundredV(score: number) {
  return raceV(800, 1, 15, score);
}
// Equivalent race time in minutes for any distance. The window runs from
// 500 m/min (faster than any world record) to 40 m/min (a slow walk), which
// covers scores of about 4 to 97 at every distance.
function raceMinutes(d: number, score: number) {
  return d / raceV(d, d / 500, d / 40, score);
}

export function clock(sec: number) {
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const ss = (s < 10 ? "0" : "") + s;
  return h > 0 ? h + ":" + (m < 10 ? "0" : "") + m + ":" + ss : m + ":" + ss;
}

// Same leniency as the mock-up: blanks, junk and negatives all count as 0.
export function parseTimePart(value: string) {
  const n = parseInt(value, 10);
  return isNaN(n) || n < 0 ? 0 : n;
}

export type CalculatorMode = "goal" | "race";

type Lane = { name: string; description: string; pace: string };

export type SessionKind = "I" | "T" | "G" | "R" | "E" | "F";

export type LogbookResult =
  | { ok: false; message: string }
  | {
      ok: true;
      what: string;
      goalPace: string;
      unitName: string;
      score: string;
      lanes: Lane[];
      splitHead: string;
      splitSummary: string;
      splitsOpen: boolean;
      splits: { label: string; time: string; finish: boolean }[];
      sessions: { kind: SessionKind; title: string; big: string; detail: string }[];
    };

export type RecentRaceResult =
  | { ok: false; message: string }
  | {
      ok: true;
      what: string;
      racePace: string;
      unitName: string;
      score: string;
      lanes: Lane[];
      equivalents: { key: DistanceKey; label: string; time: string; pace: string; yours: boolean }[];
      // One pace score point quicker at the same distance, or null if that
      // would beat the world record (goal mode would reject it).
      nextTarget: { key: DistanceKey; label: string; seconds: number; time: string } | null;
    };

const PLANS: Record<DistanceKey, string[]> = {
  "1500m": ["goal400", "interval800x4", "fast200", "tempo20"],
  mile: ["goal400", "interval800x4", "fast200", "tempo20"],
  "3k": ["goal600", "interval800", "strides", "tempo20"],
  "5k": ["interval800", "goal1k", "tempo20", "strides"],
  "5mi": ["interval1k", "goal2k", "cruise10", "long75"],
  "10k": ["interval1k", "goal2k", "cruise10", "long75"],
  "10mi": ["cruiseMile", "goal3k", "interval1k6", "longFast"],
  half: ["cruiseMile", "goal3k", "interval1k6", "longFast"],
  mar: ["longMar", "goal16", "tempo2x20", "interval1k6"],
};

// Works out the pace score for a time over a distance, or explains why it
// can't. Used by both modes; only the wording differs.
function scoreOrError(
  key: DistanceKey,
  total: number,
  mode: CalculatorMode,
): { ok: true; sc: number } | { ok: false; message: string } {
  const d = DISTANCES[key];
  if (total <= 0)
    return {
      ok: false,
      message: mode === "goal" ? "Enter a goal time to see your paces." : "Enter your race time to see your paces.",
    };
  const sc = scoreFor(d.m, total / 60);
  // A score of 86 is about world-record level from 5K up, but on the track
  // the real records only score about 83.5, so those distances also check
  // the record time itself.
  if (sc > 86 || ("record" in d && total < d.record))
    return {
      ok: false,
      message: "That is quicker than the world record. Check the hours, minutes and seconds.",
    };
  if (sc < 20)
    return {
      ok: false,
      message:
        mode === "goal"
          ? "That goal time is too slow for this calculator to work out. Enter a quicker time."
          : "That time is too slow for this calculator to work out. Check the hours, minutes and seconds.",
    };
  return { ok: true, sc };
}

function unitHelpers(unit: PaceUnit) {
  const U = unit === "km" ? 1000 : MILE;
  return {
    U,
    uName: unit === "km" ? "per km" : "per mile",
    pace: (v: number) => clock((U / v) * 60),
  };
}

// The six training speeds (m per min) for a pace score. gv is the race speed
// the score came from, which is the marathon pace when the race is a marathon.
function trainingSpeeds(key: DistanceKey, sc: number, gv: number) {
  return {
    E1: vAt(sc * 0.62),
    E2: vAt(sc * 0.74),
    M: key === "mar" ? gv : marathonV(sc),
    T: vAt(sc * 0.88),
    I: vAt(sc * 0.975),
    R: vAt(sc * 1.07),
    F: eightHundredV(sc),
  };
}

function trainingLanes(speeds: ReturnType<typeof trainingSpeeds>, pace: (v: number) => string): Lane[] {
  const { E1, E2, M, T, I, R, F } = speeds;
  return [
    { name: "Easy", description: "Most of your running. You can chat the whole way.", pace: pace(E2) + " to " + pace(E1) },
    { name: "Marathon", description: "Steady. Used in longer runs.", pace: pace(M) },
    { name: "Threshold", description: "Comfortably hard. A few words at a time.", pace: pace(T) },
    { name: "Interval", description: "Hard. Reps of 3 to 5 minutes.", pace: pace(I) },
    { name: "Repetition", description: "Fast and relaxed. Short reps, full recovery.", pace: pace(R) },
    { name: "Fast reps", description: "Very fast, very short reps. Long recovery.", pace: pace(F) },
  ];
}

export function calculateLogbook(
  key: DistanceKey,
  unit: PaceUnit,
  hours: number,
  minutes: number,
  seconds: number,
): LogbookResult {
  const d = DISTANCES[key];
  const { U, uName, pace } = unitHelpers(unit);
  const total = hours * 3600 + minutes * 60 + seconds;

  const checked = scoreOrError(key, total, "goal");
  if (!checked.ok) return checked;
  const sc = checked.sc;

  const gv = d.m / (total / 60); // goal speed, m per min
  const rep = (dist: number, v: number) => clock((dist / v) * 60);

  const speeds = trainingSpeeds(key, sc, gv);
  const { E1, E2, T, I, R, F } = speeds;
  const lanes = trainingLanes(speeds, pace);

  // Splits at even pace: every 400m lap on the track, otherwise every km or mile
  const laps = "laps" in d;
  const S = laps ? 400 : U;
  const splits: { label: string; time: string; finish: boolean }[] = [];
  const n = Math.floor(d.m / S + 1e-9);
  const label = (k: number) => (laps ? k * 400 + "m" : unit === "km" ? "km " + k : "mile " + k);
  for (let k = 1; k <= n; k++) {
    const last = Math.abs(k * S - d.m) < 1;
    splits.push({ label: last ? "Finish" : label(k), time: clock(((k * S) / gv) * 60), finish: last });
  }
  if (Math.abs(n * S - d.m) >= 1) splits.push({ label: "Finish", time: clock(total), finish: true });

  // Workouts
  const e = pace(E2) + " to " + pace(E1) + " " + uName;
  const W: Record<string, [SessionKind, string, string, string]> = {
    interval800: ["I", "6 x 800m at interval pace", rep(800, I) + " per rep", "Jog 2 minutes between reps."],
    interval800x4: ["I", "4 x 800m at interval pace", rep(800, I) + " per rep", "Jog 2 minutes between reps."],
    interval1k: ["I", "5 x 1km at interval pace", rep(1000, I) + " per rep", "Jog 2 to 3 minutes between reps."],
    interval1k6: ["I", "6 x 1km at interval pace", rep(1000, I) + " per rep", "Jog 2 minutes between reps."],
    tempo20: ["T", "20 minute threshold run", pace(T) + " " + uName, "One continuous effort. Comfortably hard, never a sprint."],
    cruise10: ["T", "3 x 10 minutes at threshold", pace(T) + " " + uName, "Jog 2 minutes between efforts."],
    cruiseMile: ["T", "5 x 1 mile at threshold", rep(MILE, T) + " per mile", "Jog 60 seconds between reps."],
    tempo2x20: ["T", "2 x 20 minutes at threshold", pace(T) + " " + uName, "Jog 3 minutes between efforts."],
    goal400: ["G", "6 x 400m at goal pace", rep(400, gv) + " per rep", "Recover for 90 seconds to 2 minutes between reps."],
    goal600: ["G", "5 x 600m at goal pace", rep(600, gv) + " per rep", "Recover for 90 seconds between reps."],
    goal1k: ["G", "5 x 1km at goal pace", rep(1000, gv) + " per rep", "Recover for 90 seconds between reps."],
    goal2k: ["G", "4 x 2km at goal pace", rep(2000, gv) + " per rep", "Jog 2 minutes between reps."],
    goal3k: ["G", "3 x 3km at goal pace", rep(3000, gv) + " per rep", "Jog 2 minutes between reps."],
    goal16: ["G", "16km at goal pace", pace(gv) + " " + uName, "About " + clock((16000 / gv) * 60) + " of running. A dress rehearsal for race day."],
    strides: ["R", "8 x 200m at repetition pace", rep(200, R) + " per rep", "Walk back to the start to recover fully."],
    fast200: ["F", "8 x 200m at fast reps pace", rep(200, F) + " per rep", "Walk back to the start to recover fully."],
    long75: ["E", "Long run, 75 to 90 minutes", e, "Keep it easy from start to finish."],
    longFast: ["E", "Long run with a fast finish", e, "Run 90 minutes easy, then the last 20 minutes at " + pace(gv) + " " + uName + "."],
    longMar: ["E", "Long run with a goal pace finish", e, "Run 2 hours easy, then the last 30 minutes at " + pace(gv) + " " + uName + "."],
  };

  return {
    ok: true,
    what: clock(total) + " " + d.name,
    goalPace: pace(gv),
    unitName: uName,
    score: sc.toFixed(1),
    lanes,
    splitHead: laps ? "Distance" : unit === "km" ? "Kilometre" : "Mile",
    splitSummary: "Even splits, " + pace(gv) + " " + uName,
    splitsOpen: n <= 14,
    splits,
    sessions: PLANS[key].map((id) => {
      const [kind, title, big, detail] = W[id];
      return { kind, title, big, detail };
    }),
  };
}

// "I've run a recent race": the same pace score, read the other way round.
// Training paces for current fitness, what the race is worth at the other
// distances, and a next goal one pace score point quicker.
export function calculateRecentRace(
  key: DistanceKey,
  unit: PaceUnit,
  hours: number,
  minutes: number,
  seconds: number,
): RecentRaceResult {
  const d = DISTANCES[key];
  const { uName, pace } = unitHelpers(unit);
  const total = hours * 3600 + minutes * 60 + seconds;

  const checked = scoreOrError(key, total, "race");
  if (!checked.ok) return checked;
  const sc = checked.sc;

  const rv = d.m / (total / 60); // race speed, m per min

  const equivalents = (Object.keys(DISTANCES) as DistanceKey[]).map((k) => {
    const other = DISTANCES[k];
    const mins = k === key ? total / 60 : raceMinutes(other.m, sc);
    return { key: k, label: other.label, time: clock(mins * 60), pace: pace(other.m / mins), yours: k === key };
  });

  const targetSeconds = Math.round(raceMinutes(d.m, sc + 1) * 60);
  const nextTarget = scoreOrError(key, targetSeconds, "goal").ok
    ? { key, label: d.name, seconds: targetSeconds, time: clock(targetSeconds) }
    : null;

  return {
    ok: true,
    what: clock(total) + " " + d.name,
    racePace: pace(rv),
    unitName: uName,
    score: sc.toFixed(1),
    lanes: trainingLanes(trainingSpeeds(key, sc, rv), pace),
    equivalents,
    nextTarget,
  };
}

// "Hilly course?": a rule of thumb from Jack Daniels' hill estimates. Each
// metre climbed costs about 4.1 metres on the flat and each metre descended
// gives back about 2.4, so
//   equivalent flat distance = distance + 4.1 x climb - 2.4 x descent
//   hill-adjusted time       = goal time x equivalent flat distance / distance
// Climb or descent over 10% of the distance is too steep for this estimate.
export type HillEstimate =
  | { steep: true }
  | { steep: false; time: string; pace: string; unitName: string; difference: string; direction: "slower" | "quicker" | "same" };

export function hillEstimate(
  key: DistanceKey,
  unit: PaceUnit,
  goalSeconds: number,
  climb: number,
  descent: number,
): HillEstimate {
  const d = DISTANCES[key].m;
  if (climb > d * 0.1 || descent > d * 0.1) return { steep: true };
  const { uName, pace } = unitHelpers(unit);
  const flat = d + 4.1 * climb - 2.4 * descent;
  const seconds = (goalSeconds * flat) / d;
  const diff = Math.round(seconds) - Math.round(goalSeconds);
  return {
    steep: false,
    time: clock(seconds),
    pace: pace(d / (seconds / 60)),
    unitName: uName,
    // Under a minute reads better in words: "36 seconds", not "0:36".
    difference: Math.abs(diff) < 60 ? `${Math.abs(diff)} second${Math.abs(diff) === 1 ? "" : "s"}` : clock(Math.abs(diff)),
    direction: diff > 0 ? "slower" : diff < 0 ? "quicker" : "same",
  };
}

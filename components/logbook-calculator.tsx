"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  DISTANCES,
  calculateLogbook,
  calculateRecentRace,
  hillEstimate,
  parseTimePart,
  type CalculatorMode,
  type DistanceKey,
  type PaceUnit,
} from "@/lib/logbook-paces";

// The interactive part of the Training logbook. Two modes: "I have a goal
// time" (goal pace, training paces, splits and workouts — the original
// mock-up) and "I've run a recent race" (current fitness, equivalent times
// and how to keep improving). Markup and class names mirror the
// training-logbook.html mock-up so app/logbook/logbook.css styles it as-is.
export function LogbookCalculator() {
  const [mode, setMode] = useState<CalculatorMode>("goal");
  const [dist, setDist] = useState<DistanceKey>("half");
  const [unit, setUnit] = useState<PaceUnit>("km");
  const [hours, setHours] = useState("1");
  const [minutes, setMinutes] = useState("15");
  const [seconds, setSeconds] = useState("0");
  const [climb, setClimb] = useState("");
  const [sameStartFinish, setSameStartFinish] = useState(true);
  const [descent, setDescent] = useState("");

  const time = [parseTimePart(hours), parseTimePart(minutes), parseTimePart(seconds)] as const;
  const goal = mode === "goal" ? calculateLogbook(dist, unit, ...time) : null;
  const race = mode === "race" ? calculateRecentRace(dist, unit, ...time) : null;

  // "Hilly course?" is ignored until a climb is entered. An empty descent box
  // counts as no descent. Entered in feet; hillEstimate works in metres.
  const climbMetres = feetToMetres(climb);
  const descentMetres = sameStartFinish ? climbMetres : (feetToMetres(descent) ?? 0);
  const hill =
    goal?.ok && climbMetres !== null
      ? hillEstimate(dist, unit, time[0] * 3600 + time[1] * 60 + time[2], climbMetres, descentMetres!)
      : null;
  const result = goal ?? race!;

  // Like the mock-up, every change re-decides whether the splits start open
  // (short races open, long ones folded), even if the visitor toggled it.
  const splitBox = useRef<HTMLDetailsElement>(null);
  const splitsOpen = goal?.ok ? goal.splitsOpen : undefined;
  useEffect(() => {
    if (splitBox.current && splitsOpen !== undefined) splitBox.current.open = splitsOpen;
  });

  // "See what that goal needs": switch to goal mode with the next target
  // filled in, and bring the form back into view.
  const form = useRef<HTMLFormElement>(null);
  function applyTarget(key: DistanceKey, targetSeconds: number) {
    setMode("goal");
    setDist(key);
    setHours(String(Math.floor(targetSeconds / 3600)));
    setMinutes(String(Math.floor((targetSeconds % 3600) / 60)));
    setSeconds(String(targetSeconds % 60));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    form.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  const lanes = result.ok && (
    <ol className="lanes">
      {result.lanes.map((lane, i) => (
        <li key={lane.name} className={`l${i + 1}`}>
          <span className="num" aria-hidden="true">
            {i + 1}
          </span>
          <span>
            <b>{lane.name}</b>
            <small>{lane.description}</small>
          </span>
          <span className="p">
            {lane.pace}
            <em>{result.unitName}</em>
          </span>
        </li>
      ))}
    </ol>
  );
  const lanesLink = (
    <p className="lanes-link">
      <Link href="/logbook/definitions">What do these paces mean?</Link>
    </p>
  );

  return (
    <>
      <form ref={form} onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend>Start from</legend>
          <div className="chips">
            <label>
              <input type="radio" name="mode" value="goal" checked={mode === "goal"} onChange={() => setMode("goal")} />
              <span>I have a goal time</span>
            </label>
            <label>
              <input type="radio" name="mode" value="race" checked={mode === "race"} onChange={() => setMode("race")} />
              <span>{"I've run a recent race"}</span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Race distance</legend>
          <div className="chips">
            {(Object.keys(DISTANCES) as DistanceKey[]).map((key) => (
              <label key={key}>
                <input
                  type="radio"
                  name="dist"
                  value={key}
                  checked={dist === key}
                  onChange={() => setDist(key)}
                />
                <span>{DISTANCES[key].label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{mode === "goal" ? "Goal time" : "Your time"}</legend>
          <div className="time">
            <label>
              Hours
              <input type="number" inputMode="numeric" min={0} max={9} value={hours} onChange={(e) => setHours(e.target.value)} />
            </label>
            <label>
              Minutes
              <input type="number" inputMode="numeric" min={0} max={59} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
            </label>
            <label>
              Seconds
              <input type="number" inputMode="numeric" min={0} max={59} value={seconds} onChange={(e) => setSeconds(e.target.value)} />
            </label>
          </div>
        </fieldset>

        {mode === "goal" && (
          <fieldset>
            <legend>Hilly course?</legend>
            <div className="time hills">
              <label>
                Total climb (feet)
                <input type="number" inputMode="numeric" min={0} value={climb} onChange={(e) => setClimb(e.target.value)} />
              </label>
              {!sameStartFinish && (
                <label>
                  Total descent (feet)
                  <input type="number" inputMode="numeric" min={0} value={descent} onChange={(e) => setDescent(e.target.value)} />
                </label>
              )}
            </div>
            <label className="tick">
              <input type="checkbox" checked={sameStartFinish} onChange={(e) => setSameStartFinish(e.target.checked)} />
              Starts and finishes at the same place
            </label>
          </fieldset>
        )}

        <fieldset>
          <legend>Show paces</legend>
          <div className="chips">
            <label>
              <input type="radio" name="unit" value="km" checked={unit === "km"} onChange={() => setUnit("km")} />
              <span>Per km</span>
            </label>
            <label>
              <input type="radio" name="unit" value="mi" checked={unit === "mi"} onChange={() => setUnit("mi")} />
              <span>Per mile</span>
            </label>
          </div>
        </fieldset>
      </form>

      <div className="error" role="alert" hidden={result.ok}>
        {result.ok ? null : result.message}
      </div>

      <div hidden={!result.ok}>
        {goal?.ok && (
          <>
            <section className="goal" aria-live="polite">
              <p className="what">{goal.what}</p>
              <p className="pace">{goal.goalPace}</p>
              <p className="unit">{goal.unitName} on race day</p>
              <p className="score">
                Pace score <strong>{goal.score}</strong>
              </p>
            </section>

            {hill && (
              <section className="hill-card" aria-live="polite">
                <h3>On this course</h3>
                {hill.steep ? (
                  <p>{"That's too steep for this estimate."}</p>
                ) : (
                  <>
                    <p>
                      The same effort as your goal would take about <strong>{hill.time}</strong> ({hill.pace}{" "}
                      {hill.unitName}).
                    </p>
                    <p>
                      {hill.direction === "same"
                        ? "That's about the same as on a flat course."
                        : `That's about ${hill.difference} ${hill.direction} than on a flat course.`}
                    </p>
                  </>
                )}
                <p className="hill-note">
                  This is an estimate. Each foot you climb costs about the same as 4 extra feet on the flat, and you only
                  get some of it back on the way down. It works for road and gentle trail hills, not steep fell running.
                </p>
              </section>
            )}

            <h2>Training paces</h2>
            {lanesLink}
            {lanes}

            <h2>Race splits</h2>
            <details ref={splitBox} open={goal.splitsOpen}>
              <summary>{goal.splitSummary}</summary>
              <div className="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{goal.splitHead}</th>
                      <th>Clock time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goal.splits.map((split) => (
                      <tr key={split.label} className={split.finish ? "finish" : undefined}>
                        <td>{split.label}</td>
                        <td>{split.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>

            <h2>Suggested workouts</h2>
            <div className="sessions">
              {goal.sessions.map((session) => (
                <article key={session.title} className={`session s-${session.kind}`}>
                  <h3>{session.title}</h3>
                  <p className="big">{session.big}</p>
                  <p>{session.detail}</p>
                </article>
              ))}
            </div>
            <p className="note">Start every session with 10 to 15 minutes of easy running and finish the same way.</p>
          </>
        )}

        {race?.ok && (
          <>
            <section className="goal" aria-live="polite">
              <p className="what">{race.what}</p>
              <p className="pace">{race.racePace}</p>
              <p className="unit">{race.unitName}, your current fitness</p>
              <p className="score">
                Pace score <strong>{race.score}</strong>
              </p>
            </section>

            <h2>{"What that's worth at other distances"}</h2>
            <div className="table-box">
              <div className="scroll">
                <table className="equiv">
                  <thead>
                    <tr>
                      <th>Distance</th>
                      <th>Time</th>
                      <th>Pace {race.unitName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {race.equivalents.map((row) => (
                      <tr key={row.key} className={row.yours ? "yours" : undefined}>
                        <td>
                          {row.label}
                          {row.yours && <span className="sr-only"> (your race)</span>}
                        </td>
                        <td>{row.time}</td>
                        <td>{row.pace}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <h2>Your training paces right now</h2>
            {lanesLink}
            {lanes}

            <h2>Maintain or get quicker?</h2>
            <div className="advice">
              <article className="a-maintain">
                <h3>To maintain</h3>
                <p>
                  Keep training at the paces above. Most weeks, do one harder session (threshold or interval), one
                  long run, and keep everything else easy. {"That's"} enough to hold the fitness you have.
                </p>
              </article>
              <article className="a-quicker">
                <h3>To get quicker</h3>
                <p>
                  Train at the paces above, not at your goal pace. Fitness comes from consistent training at the
                  right effort for where you are now.
                </p>
                <p>
                  Build up to two harder sessions a week plus a long run, with easy running in between. Increase
                  your weekly running gradually.
                </p>
                <p>
                  After four to six weeks of consistent training, or when you run a faster race, come back and
                  update your time so your paces move up with you.
                </p>
              </article>
            </div>

            {race.nextTarget && (
              <div className="next">
                <p>
                  A realistic next target: <strong>{race.nextTarget.time} {race.nextTarget.label}</strong>
                </p>
                <button
                  type="button"
                  className="cta"
                  onClick={() => applyTarget(race.nextTarget!.key, race.nextTarget!.seconds)}
                >
                  See what that goal needs
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// A feet box, converted to metres: empty, junk or negative counts as not entered.
function feetToMetres(value: string): number | null {
  if (value.trim() === "") return null;
  const feet = Number(value);
  return Number.isFinite(feet) && feet >= 0 ? feet * 0.3048 : null;
}

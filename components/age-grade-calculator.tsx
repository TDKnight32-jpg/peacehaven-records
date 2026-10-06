"use client";

import { useState } from "react";
import { AGE_GRADE_BANDS, AGE_GRADE_DISTANCES, ageGrade, type AgeGradeDistance, type Gender } from "@/lib/age-grading";
import { DISTANCES, clock, parseTimePart } from "@/lib/logbook-paces";

// The Age grading page's form and result. Uses the same classes as the pace
// calculator (components/logbook-calculator.tsx), so it looks the same.
export function AgeGradeCalculator() {
  const [gender, setGender] = useState<Gender | null>(null);
  const [age, setAge] = useState("40");
  const [dist, setDist] = useState<AgeGradeDistance>("5k");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("25");
  const [seconds, setSeconds] = useState("0");

  const total = parseTimePart(hours) * 3600 + parseTimePart(minutes) * 60 + parseTimePart(seconds);
  const ageNumber = age.trim() === "" ? NaN : Number(age);
  const result = ageGrade(gender, ageNumber, dist, total);

  return (
    <>
      <form onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend>Gender</legend>
          <div className="chips">
            <label>
              <input type="radio" name="gender" value="male" checked={gender === "male"} onChange={() => setGender("male")} />
              <span>Male</span>
            </label>
            <label>
              <input
                type="radio"
                name="gender"
                value="female"
                checked={gender === "female"}
                onChange={() => setGender("female")}
              />
              <span>Female</span>
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Age on race day</legend>
          <div className="time age">
            <label>
              Age
              <input type="number" inputMode="numeric" min={5} max={100} value={age} onChange={(e) => setAge(e.target.value)} />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Race distance</legend>
          <div className="chips">
            {AGE_GRADE_DISTANCES.map((key) => (
              <label key={key}>
                <input type="radio" name="dist" value={key} checked={dist === key} onChange={() => setDist(key)} />
                <span>{DISTANCES[key].label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Your time</legend>
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
      </form>

      <div className="error" role="alert" hidden={result.ok}>
        {result.ok ? null : result.message}
      </div>

      {result.ok && (
        <section className="goal" aria-live="polite">
          <p className="what">
            {`${clock(total)} ${DISTANCES[dist].name}, ${gender} aged ${ageNumber}`}
          </p>
          <p className="pace">{result.percent}%</p>
          <p className="unit">age grade</p>
          <p className="score">
            Age-graded time <strong>{result.gradedTime}</strong>, the equivalent for a runner in their prime
          </p>
        </section>
      )}

      <h2>What your percentage means</h2>
      <div className="table-box">
        <table className="bands">
          <thead>
            <tr>
              <th>Age grade</th>
              <th>Level</th>
            </tr>
          </thead>
          <tbody>
            {AGE_GRADE_BANDS.map((band) => {
              const yours = result.ok && result.band === band.label;
              return (
                <tr key={band.label} className={yours ? "yours" : undefined}>
                  <td>
                    {band.label}
                    {yours && <span className="sr-only"> (your result)</span>}
                  </td>
                  <td>{band.meaning}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

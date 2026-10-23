"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FestiveData, FestiveResult } from "@/lib/festive5k";

type Props = FestiveData & { nextRace: { year: number; month: number; day: number } };

const fmt = (s: number) => {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:${String(m).padStart(2, "0")}` : `${m}`) + ":" + String(x).padStart(2, "0");
};
const ord = (n: number) => {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function FestiveBoard({ results, years, error, nextRace }: Props) {
  const [year, setYear] = useState<number | null>(years[0] ?? null);
  const [g, setG] = useState<"all" | "M" | "F">("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<FestiveResult | null>(null);

  const byName = useMemo(() => {
    const m = new Map<string, FestiveResult[]>();
    for (const r of results) m.set(r.name, [...(m.get(r.name) ?? []), r]);
    for (const l of m.values()) l.sort((a, b) => a.year - b.year);
    return m;
  }, [results]);
  const firstYear = years.length ? Math.min(...years) : 0;
  const prevOf = (r: FestiveResult) => byName.get(r.name)!.filter((x) => x.year < r.year).pop();

  const best = (gen: "M" | "F") => results.filter((r) => r.gender === gen).sort((a, b) => a.secs - b.secs)[0];
  const recM = best("M"), recF = best("F");
  const winners = years.map((y) => ({
    y,
    m: results.find((r) => r.year === y && r.gender === "M" && r.genderPos === 1),
    f: results.find((r) => r.year === y && r.gender === "F" && r.genderPos === 1),
  }));

  const yr = results.filter((r) => r.year === year);
  const back = yr.filter((r) => prevOf(r));
  const faster = back.filter((r) => r.secs < prevOf(r)!.secs);
  const avg = yr.length ? yr.reduce((s, r) => s + r.secs, 0) / yr.length : 0;
  const list = yr.filter((r) => (g === "all" || r.gender === g) && (!q || r.name.toLowerCase().includes(q.toLowerCase())));

  const raceDate = new Date(nextRace.year, nextRace.month - 1, nextRace.day);
  const edition = years.includes(nextRace.year) ? years.length : years.length + 1;

  // Countdown runs in the browser so it's always today's number.
  const [countdown, setCountdown] = useState<string | null>(null);
  useEffect(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    const d = Math.round((raceDate.getTime() - t.getTime()) / 864e5);
    setCountdown(d > 1 ? `${d} sleeps to go` : d === 1 ? "Tomorrow!" : d === 0 ? "Race day!" : `${nextRace.year} results in`);
  }, [raceDate.getTime(), nextRace.year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    addEventListener("keydown", k);
    return () => removeEventListener("keydown", k);
  }, [open]);

  const vsChip = (r: FestiveResult) => {
    if (r.year === firstYear) return <span className="dim">—</span>;
    const p = prevOf(r);
    if (!p) return <span className="chip new">Debut</span>;
    const d = r.secs - p.secs;
    if (d === 0) return <span className="chip">same</span>;
    return d < 0 ? <span className="chip up">▲ {fmt(-d)} faster</span> : <span className="chip down">▼ {fmt(d)} slower</span>;
  };

  return (
    <>
      <Snow />
      <main className="wrap">
        <header className="hero">
          <div className="club"><span className="dot" />Peacehaven Run Club</div>
          <h1>PRC <em>Festive</em> 5K</h1>
          <p className="sub">
            The club&apos;s Christmas race. Every result since the first one, with course records, past winners, and how
            each runner has got on year to year. Tap any name to open their race bib.
          </p>
          <div className="ribbon">
            <span>Race day <b>{DAYS[raceDate.getDay()]} {raceDate.getDate()} {MONTHS[raceDate.getMonth()]} {nextRace.year}</b></span>
            {countdown && <span><b>{countdown}</b></span>}
            <span>Edition <b>№{edition}</b></span>
            <span>Stopwatch timed</span>
          </div>
        </header>

        {error && <div className="board empty">{error}</div>}

        {recM && recF && (
          <section className="honours" aria-label="Course records and winners">
            {[{ l: "Men", r: recM }, { l: "Women", r: recF }].map(({ l, r }) => (
              <div className="hon rec" key={l}>
                <span className="lab">Course record · {l}</span>
                <span className="t">{fmt(r.secs)}</span>
                <span className="who">{r.name}</span>
                <span className="yr">Set in {r.year}</span>
              </div>
            ))}
            <div className="hon">
              <span className="lab">Previous winners</span>
              <div className="winners">
                {winners.map((w) => (
                  <div key={w.y}><span className="y">{w.y}</span><span className="n">{w.m?.name ?? "—"} · {w.f?.name ?? "—"}</span></div>
                ))}
              </div>
            </div>
          </section>
        )}

        {years.length > 0 && (
          <section className="board" aria-label="Results">
            <div className="bhead">
              <div className="years" role="group" aria-label="Year">
                {years.map((y) => (
                  <button key={y} aria-pressed={y === year} onClick={() => setYear(y)}>{y}</button>
                ))}
              </div>
              <div className="tools">
                <div className="seg" role="group" aria-label="Filter">
                  {(["all", "M", "F"] as const).map((k) => (
                    <button key={k} aria-pressed={g === k} onClick={() => setG(k)}>{k === "all" ? "All" : k === "M" ? "Men" : "Women"}</button>
                  ))}
                </div>
                <input id="festive-q" type="search" placeholder="Find a runner" aria-label="Find a runner" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <div className="stats">
              <div className="stat"><span className="lab">Finishers</span><span className="v">{yr.length}</span></div>
              <div className="stat"><span className="lab">Average time</span><span className="v">{fmt(avg)}</span></div>
              <div className="stat"><span className="lab">Men · Women</span><span className="v">{yr.filter((r) => r.gender === "M").length} · {yr.filter((r) => r.gender === "F").length}</span></div>
              <div className="stat">
                <span className="lab">{year === firstYear ? "First edition" : "Course PBs"}</span>
                <span className="v">{year === firstYear ? "★" : `${faster.length} / ${back.length}`}</span>
              </div>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr><th>Pos</th><th>Runner</th><th className="hide-s">Bib</th><th>Time</th><th className="hide-s">Gender pos</th><th>vs last year</th></tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.name + r.year} className={`p${r.pos}`} tabIndex={0} onClick={() => setOpen(r)} onKeyDown={(e) => e.key === "Enter" && setOpen(r)}>
                      <td className="pos">{r.pos}</td>
                      <td className="nm">{r.name}{r.guest && <small>Guest</small>}</td>
                      <td className="hide-s mono dim">{r.bib}</td>
                      <td className="time">{fmt(r.secs)}</td>
                      <td className="hide-s"><span className="g">{ord(r.genderPos)} {r.gender === "M" ? "man" : "woman"}</span></td>
                      <td>{vsChip(r)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length === 0 && <div className="empty">No runners match that search.</div>}
            </div>
          </section>
        )}
        <p className="foot">Results from the PRC Festive 5K results sheet · Age grades use the 2025 road tables</p>
      </main>
      {open && <Bib r={open} history={byName.get(open.name)!} results={results} prev={prevOf(open)} onClose={() => setOpen(null)} />}
    </>
  );
}

function Bib({ r, history, results, prev, onClose }: { r: FestiveResult; history: FestiveResult[]; results: FestiveResult[]; prev?: FestiveResult; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => close.current?.focus(), []);
  const yr = results.filter((x) => x.year === r.year);
  const gCount = yr.filter((x) => x.gender === r.gender).length;
  const cCount = r.category ? yr.filter((x) => x.gender === r.gender && x.category === r.category).length : 0;
  const pb = Math.min(...history.map((x) => x.secs));
  const max = Math.max(...history.map((x) => x.secs));
  const first = r.name.split(" ")[0];
  const last = history[history.length - 1];

  let verdict: React.ReactNode;
  if (!prev) {
    verdict = history.length > 1
      ? <>First Festive 5K was {r.year}. Came back in {last.year} and ran <b className={last.secs < r.secs ? "" : "slow"}>{fmt(Math.abs(last.secs - r.secs))} {last.secs < r.secs ? "quicker" : "slower"}</b>.</>
      : <>{r.year} was {first}&apos;s first Festive 5K. Next year&apos;s run will show progress here.</>;
  } else {
    const d = r.secs - prev.secs;
    verdict = d < 0 ? <><b>{fmt(-d)} quicker</b> than {prev.year}{r.secs === pb ? " and a course PB" : ""}.</>
      : d > 0 ? <><b className="slow">{fmt(d)} slower</b> than {prev.year}. Course PB still stands at {fmt(pb)}.</>
      : <>Exactly the same time as {prev.year}.</>;
  }

  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bib" role="dialog" aria-modal="true" aria-label={`${r.name} ${r.year}`}>
        <span className="pin a" /><span className="pin b" />
        <div className="bibtop">PRC FESTIVE 5K · {r.year}</div>
        <button ref={close} className="close" aria-label="Close" onClick={onClose}>×</button>
        <div className="bibnum">{r.bib || "—"}</div>
        <div className="bibname">{r.name}</div>
        <div className="bibmeta">{r.gender === "M" ? "Male" : "Female"}{r.guest ? " · Guest" : ""} · {history.length} Festive 5K{history.length > 1 ? "s" : ""}</div>
        <div className="bibbody">
          <div className="grid4">
            <div className="cell"><span className="lab">Finish time</span><span className="v">{fmt(r.secs)}</span></div>
            <div className="cell"><span className="lab">Overall</span><span className="v">{ord(r.pos)} <small>of {yr.length}</small></span></div>
            <div className="cell"><span className="lab">{r.gender === "M" ? "Men" : "Women"}</span><span className="v">{ord(r.genderPos)} <small>of {gCount}</small></span></div>
            <div className="cell"><span className="lab">Course PB</span><span className="v">{fmt(pb)}</span></div>
            {r.category && r.categoryPos ? (
              <div className="cell"><span className="lab">{r.gender === "M" ? "M" : "F"} {r.category}</span><span className="v">{ord(r.categoryPos)} <small>of {cCount}</small></span></div>
            ) : (
              <div className="cell locked"><span className="lab">Age category</span><span className="v">Unlocks when age is added</span></div>
            )}
            {r.ageGrade ? (
              <div className="cell"><span className="lab">Age grade</span><span className="v">{r.ageGrade}%</span></div>
            ) : (
              <div className="cell locked"><span className="lab">Age grade</span><span className="v">Unlocks when age is added</span></div>
            )}
          </div>
          <div className="hist">
            <h3>Festive 5K history</h3>
            {history.map((x) => (
              <div key={x.year} className={`hrow ${x.year === r.year ? "cur" : ""}`}>
                <span className="y">{x.year}</span>
                <span className="bar"><i style={{ width: `${Math.max(18, (100 * x.secs) / max)}%` }} /></span>
                <span className="tt">{fmt(x.secs)}</span>
              </div>
            ))}
          </div>
          <div className="verdict">{verdict}</div>
        </div>
      </div>
    </div>
  );
}

function Snow() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = ref.current!, x = c.getContext("2d")!;
    let W = 0, H = 0, raf = 0;
    let f: { x: number; y: number; r: number; s: number; d: number }[] = [];
    const size = () => {
      W = c.width = innerWidth; H = c.height = innerHeight;
      f = Array.from({ length: Math.min(90, W / 12) }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.6, s: Math.random() * 0.5 + 0.2, d: Math.random() * Math.PI * 2 }));
    };
    size();
    addEventListener("resize", size);
    const tick = () => {
      x.clearRect(0, 0, W, H);
      x.fillStyle = "rgba(244,246,240,.55)";
      for (const p of f) {
        p.y += p.s; p.d += 0.01; p.x += Math.sin(p.d) * 0.3;
        if (p.y > H) { p.y = -4; p.x = Math.random() * W; }
        x.beginPath(); x.arc(p.x, p.y, p.r, 0, 7); x.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} className="snow" aria-hidden="true" />;
}

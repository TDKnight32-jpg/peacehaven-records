"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Headline } from "@/lib/gp-headlines";

const ICON: Record<Headline["kind"], string> = {
  info: "📣",
  leader: "🏆",
  winner: "🥇",
  podium: "🏅",
  gap: "⚡",
  climber: "▲",
  newcomers: "👋",
  volunteers: "🙌",
};

const CATEGORY_TAG = { F: "WOMEN", M: "MEN" } as const;

/** Scroll speed in pixels per second — the animation's duration is derived
 * from the strip's measured width, so a long run of headlines moves at the
 * same comfortable pace as a short one instead of speeding up. */
const SPEED_PX_PER_SECOND = 60;

function HeadlineList({ headlines, hidden }: { headlines: Headline[]; hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {headlines.map((h, i) => (
        <li key={i} className="flex shrink-0 items-center gap-2 whitespace-nowrap px-4">
          <span aria-hidden className={h.kind === "climber" ? "text-gp-gold-edge" : ""}>
            {ICON[h.kind]}
          </span>
          {h.category && (
            <span className="rounded bg-white/15 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-primary-100">
              {CATEGORY_TAG[h.category]}
            </span>
          )}
          <span>{h.text}</span>
          <span aria-hidden className="pl-4 text-gp-gold-edge">
            ◆
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * "Breaking news" strip for the Grand Prix homepage. The headline list is
 * rendered twice side by side and the pair slides left by exactly one copy's
 * width, then repeats — so the loop is seamless. Pauses on hover (desktop)
 * or on tap / the pause button (phones, keyboards). With the OS "reduce
 * motion" setting on, it doesn't animate at all and becomes a swipeable
 * strip instead (see .gp-ticker rules in app/globals.css).
 */
export function GpNewsTicker({ headlines }: { headlines: Headline[] }) {
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState<number | null>(null);
  const firstCopy = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = firstCopy.current;
    if (!el) return;
    const measure = () => setDuration(el.scrollWidth / SPEED_PX_PER_SECOND);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (headlines.length === 0) return null;

  return (
    <section
      aria-label="Grand Prix latest news"
      className="gp-ticker flex items-stretch overflow-hidden bg-primary text-sm text-primary-foreground sm:text-[15px]"
      data-paused={paused || undefined}
      onClick={() => setPaused((p) => !p)}
    >
      <span className="z-10 flex shrink-0 items-center bg-gp-gold-edge px-3 text-xs font-extrabold tracking-widest text-foreground shadow-[4px_0_8px_rgba(0,0,0,0.2)] sm:px-4">
        LATEST
      </span>
      <div className="gp-ticker-viewport min-w-0 flex-1 overflow-hidden py-2.5">
        <div
          className="gp-ticker-track flex w-max"
          style={duration ? ({ "--gp-ticker-duration": `${duration}s` } as CSSProperties) : undefined}
        >
          {/* Each copy is at least a screen wide, so even a short list loops without a visible gap. */}
          <div ref={firstCopy} className="flex min-w-[100vw] shrink-0">
            <HeadlineList headlines={headlines} />
          </div>
          <div className="gp-ticker-dup flex min-w-[100vw] shrink-0">
            <HeadlineList headlines={headlines} hidden />
          </div>
        </div>
      </div>
      <button
        type="button"
        className="gp-ticker-toggle z-10 flex w-10 shrink-0 items-center justify-center bg-primary text-base text-primary-foreground/90 shadow-[-4px_0_8px_rgba(0,0,0,0.2)] hover:text-primary-foreground"
        aria-label={paused ? "Resume news ticker" : "Pause news ticker"}
        aria-pressed={paused}
        onClick={(e) => {
          e.stopPropagation();
          setPaused((p) => !p);
        }}
      >
        {paused ? "▶" : "❚❚"}
      </button>
    </section>
  );
}

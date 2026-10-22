import type { CSSProperties } from "react";

/** Shared icon set for the Couch to 5K section — one runner-silhouette motif
 * reused at every size (hero decoration, the trail's "you are here" marker,
 * completed badges), plus the flag used for milestone weeks (3, 6, 9) and
 * the checkmark used on completed sessions/weeks. `currentColor` throughout
 * so callers theme them with a text-color className. */

interface IconProps {
  className?: string;
  style?: CSSProperties;
}

export function Runner({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 13.9l1-4.4 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.1 12 15.1 13 16.5 13H18v-2h-1.5c-1.26 0-2.33-.8-2.68-1.94l-.9-3.08c-.3-1.02-1.2-1.68-2.27-1.68-.3 0-.5.04-.73.1l-5.2 2.17v4.43h2v-3l1.78-.72-1.6 8.17L2.4 17.63l.8 1.9 6.4-2.46c.6-.24 1.02-.8 1.14-1.46z" />
    </svg>
  );
}

export function Flag({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <rect x="4" y="2" width="2.2" height="20" rx="1.1" />
      <path d="M6.2 3.2h12.4l-3.6 4 3.6 4H6.2V3.2Z" />
    </svg>
  );
}

export function Check({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M2 8.5L6 12.5L14 3.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Close({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** One face, parameterized by mood level (1 sad → 5 grinning) rather than
 * five near-duplicate icons — the mouth's curve sweeps from a frown to a
 * grin by moving its control point. */
export function MoodFace({ level, className, style }: IconProps & { level: 1 | 2 | 3 | 4 | 5 }) {
  // Mouth corners sit at y=15; a control point above that (smaller y) bows
  // the curve upward into a frown, one below it bows down into a grin.
  const mouthControlY = 15 + (level - 3) * 3.2;
  const mouthWidth = 2 + level * 0.6;
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="8.5" cy="9.5" r="1.1" fill="currentColor" />
      <circle cx="15.5" cy="9.5" r="1.1" fill="currentColor" />
      <path
        d={`M${12 - mouthWidth} 15 Q 12 ${mouthControlY} ${12 + mouthWidth} 15`}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Star({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M12 2c.6 3.2 1.4 5.3 2.4 6.3S17.4 9.4 20.6 10c-3.2.6-5.3 1.4-6.3 2.4S12.6 15.4 12 18.6c-.6-3.2-1.4-5.3-2.4-6.3S6.6 10.6 3.4 10c3.2-.6 5.3-1.4 6.3-2.4S11.4 5.2 12 2Z" />
    </svg>
  );
}

export function Lock({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" className={className} style={style} aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function Clock({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <circle cx="12" cy="12.5" r="8.5" stroke="currentColor" strokeWidth="2" />
      <path d="M12 8v4.5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 1.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Sun({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <circle cx="12" cy="12" r="5" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 1.5v3M12 19.5v3M22.5 12h-3M4.5 12h-3" />
        <path d="M19.1 4.9l-2.1 2.1M7 17l-2.1 2.1M19.1 19.1l-2.1-2.1M7 7L4.9 4.9" />
      </g>
    </svg>
  );
}

export function Moon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} style={style} aria-hidden="true">
      <path d="M20.5 14.8A8.5 8.5 0 1 1 9.2 3.5a7 7 0 0 0 11.3 11.3Z" />
    </svg>
  );
}

export function Trophy({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M7 3h10v6a5 5 0 0 1-10 0V3Z" fill="currentColor" />
      <path
        d="M7 4.5H4a2.5 2.5 0 0 0 2.5 2.5M17 4.5h3a2.5 2.5 0 0 1-2.5 2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10.5 14.5v2M9 20.5h6M10 20.5v-2.2c0-.6.4-1.1 1-1.3l1-.3 1 .3c.6.2 1 .7 1 1.3v2.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

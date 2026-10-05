import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { RECORD_CARD_SIZE } from "./record-card-size";
import type { NewRecord } from "./record-highlights";

// A 1080x1080 PNG for sharing a new club record on WhatsApp, Instagram etc.
// The rounded card sits on a solid dark green square rather than relying on
// transparent corners, which some apps flatten to black or white.

// Same palette as app/globals.css (ImageResponse can't read CSS variables).
const COLORS = {
  backdrop: "#1b3325", // a shade darker than primary, so the card stands out
  card: "#ffffff", // surface — matches the logo's white background
  primary: "#2f563e",
  foreground: "#1c231e",
  muted: "#5c6b60",
  gold: "#a67c14",
  goldEdge: "#c99a1e",
};

// Geist and Geist Mono are the site's fonts (app/layout.tsx); times on the
// records pages are set in Geist Mono. Satori needs TTFs, so they're
// checked in under assets/fonts rather than loaded via next/font.
const fontFile = (name: string) => readFile(join(process.cwd(), "assets/fonts", name));
const [geistRegular, geistBold, geistMonoBold, logo] = await Promise.all([
  fontFile("Geist-Regular.ttf"),
  fontFile("Geist-Bold.ttf"),
  fontFile("GeistMono-Bold.ttf"),
  readFile(join(process.cwd(), "public/logo.png")),
]);
const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC", // race dates are stored as UTC midnight
});

/** Shrinks long names so they stay on at most two lines (at full size). */
function nameSize(name: string): number {
  if (name.length <= 16) return 76;
  if (name.length <= 24) return 64;
  return 52;
}

export function renderRecordCard(
  record: NewRecord,
  { size = RECORD_CARD_SIZE, headers }: { size?: number; headers?: Record<string, string> } = {},
): ImageResponse {
  // Every measurement below is in full-size (1080px) pixels.
  const px = (n: number) => (n * size) / RECORD_CARD_SIZE;
  const laps = record.unit === "laps" ? record.performance.replace(/\s*laps$/, "") : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        padding: px(64),
        backgroundColor: COLORS.backdrop,
        fontFamily: "Geist",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          borderRadius: px(48),
          overflow: "hidden",
          backgroundColor: COLORS.card,
        }}
      >
        {/* The gold top edge the site's cards have; a clipped stripe rather
              than border-top, which Satori mitres at the rounded corners. */}
        <div style={{ height: px(16), backgroundColor: COLORS.goldEdge }} />
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `${px(48)}px ${px(64)}px ${px(72)}px`,
            textAlign: "center",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain <img> only */}
          <img src={logoSrc} width={px(200)} height={px(200)} alt="" />

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: px(40), fontWeight: 700, letterSpacing: px(8), color: COLORS.gold }}>NEW CLUB RECORD</div>
            <div style={{ marginTop: px(18), fontSize: px(44), color: COLORS.primary }}>{record.listLabel}</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                fontSize: px(nameSize(record.athleteName)),
                fontWeight: 700,
                color: COLORS.foreground,
                lineHeight: 1.1,
              }}
            >
              {record.athleteName}
            </div>
            {laps ? (
              <div style={{ display: "flex", alignItems: "baseline", marginTop: px(16), color: COLORS.primary }}>
                <span style={{ fontFamily: "Geist Mono", fontSize: px(190), fontWeight: 700, lineHeight: 1 }}>{laps}</span>
                <span style={{ marginLeft: px(20), fontSize: px(64), fontWeight: 700 }}>laps</span>
              </div>
            ) : (
              <div
                style={{
                  marginTop: px(16),
                  fontFamily: "Geist Mono",
                  fontSize: px(168),
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: px(-4),
                  color: COLORS.primary,
                }}
              >
                {record.performance}
              </div>
            )}
          </div>

          <div style={{ fontSize: px(38), color: COLORS.muted }}>{dateFormat.format(new Date(record.raceDate))}</div>
        </div>
      </div>
    </div>,
    {
      width: size,
      height: size,
      fonts: [
        { name: "Geist", data: geistRegular, weight: 400, style: "normal" },
        { name: "Geist", data: geistBold, weight: 700, style: "normal" },
        { name: "Geist Mono", data: geistMonoBold, weight: 700, style: "normal" },
      ],
      headers,
    },
  );
}

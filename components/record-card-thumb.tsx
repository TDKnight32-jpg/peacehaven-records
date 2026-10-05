"use client";

import { useRef, useState } from "react";
import type { NewRecord } from "@/lib/record-highlights";
import { RECORD_CARD_THUMB_SIZE } from "@/lib/record-card-size";
import { slugify } from "@/lib/slug";

/** A record's share card (the 480px version from app/record-card/[id]) with
 * a Share button over its bottom-right corner — used by the Latest records
 * strip and the officials' approval panel. */
export function RecordCardThumb({ record, cardUrl }: { record: NewRecord; cardUrl: string }) {
  const title = `New ${record.listLabel} record`;
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element -- already a sized PNG from our own route */}
      <img
        src={`${cardUrl}?size=${RECORD_CARD_THUMB_SIZE}`}
        width={RECORD_CARD_THUMB_SIZE}
        height={RECORD_CARD_THUMB_SIZE}
        alt={`${title}: ${record.athleteName}, ${record.performance}`}
        className="block aspect-square h-auto w-full rounded-xl bg-[#1b3325]"
      />
      <ShareButton fullUrl={cardUrl} title={title} />
    </div>
  );
}

/**
 * Shares the full-size (1080x1080) card through the phone's share sheet, so
 * it can go straight to WhatsApp or Instagram; where sharing files isn't
 * supported (e.g. Firefox, Chrome on Windows) it downloads it instead. It's
 * an HTML layer over the image, so the PNG itself stays clean.
 *
 * The full PNG is only fetched once someone reaches for the button (hover,
 * touch or focus), so the page itself only loads the small versions. iOS
 * Safari won't open the share sheet if the tap's been waiting on the network
 * too long; when that happens the file is ready by then, so the button asks
 * for a second tap rather than falling back to a download.
 */
function ShareButton({ fullUrl, title }: { fullUrl: string; title: string }) {
  const file = useRef<Promise<File | null> | null>(null);
  const [tapAgain, setTapAgain] = useState(false);

  const load = () => {
    file.current ??= fetch(fullUrl)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) =>
        blob ? new File([blob], `peacehaven-${slugify(title.replace(/'/g, ""))}.png`, { type: "image/png" }) : null,
      )
      .catch(() => null);
    return file.current;
  };

  const share = async () => {
    setTapAgain(false);
    const image = await load();
    if (!image) {
      file.current = null; // let the next tap try again
      return;
    }
    if (navigator.canShare?.({ files: [image] })) {
      try {
        await navigator.share({ files: [image], title, text: `${title} — Peacehaven Run Club` });
      } catch (err) {
        // AbortError: they closed the share sheet. NotAllowedError: the tap
        // "expired" while the image loaded — it's loaded now, so a second
        // tap will open the share sheet straight away.
        if (err instanceof DOMException && err.name === "NotAllowedError") setTapAgain(true);
      }
      return;
    }
    const url = URL.createObjectURL(image);
    const link = document.createElement("a");
    link.href = url;
    link.download = image.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return (
    <button
      type="button"
      onPointerEnter={load}
      onPointerDown={load}
      onFocus={load}
      onClick={share}
      aria-label={tapAgain ? `Tap again to share ${title}` : `Share ${title}`}
      className="absolute bottom-1 right-1 inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-primary shadow-md shadow-black/30 ring-2 ring-gp-gold-edge transition-colors hover:bg-primary-50"
    >
      <svg aria-hidden viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 10V2M5 5l3-3 3 3M3 9v4h10V9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {tapAgain ? "Tap again" : "Share"}
    </button>
  );
}

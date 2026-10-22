"use client";

import { useRef } from "react";
import type { ClientBadge } from "@/lib/c25k";
import { Close, Trophy } from "@/components/c25k-icons";
import { BadgeRack } from "./badge-rack";

/** Trigger button + modal for the badge rack. A native <dialog> rather than
 * a hand-built overlay — it gives us focus-trapping, Escape-to-close, and
 * the ::backdrop pseudo-element for free, after the pinned-sidebar approach
 * (CSS sticky, then a JS scroll-listener pin) turned into more trouble than
 * it was worth and the person asked to drop it for something simpler. */
export function BadgeModalButton({ badges }: { badges: ClientBadge[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm"
      >
        <Trophy className="h-4 w-4" />
        Badges
        <span className="text-xs font-semibold opacity-80">
          {earnedCount}/{badges.length}
        </span>
      </button>

      {/* The browser gives <dialog> its own default `overflow: auto`, which
       * — Tailwind's reset doesn't touch it — clips anything a descendant
       * positions outside the dialog's own box, including the close button
       * below (it deliberately sits half outside its `relative` parent, at
       * the card's corner). `overflow-visible` on the dialog itself hands
       * all scrolling to the one inner div that's meant to scroll, and
       * `p-2` gives the close button's negative offset room to land inside
       * the dialog's own edge instead of outside it. */}
      <dialog
        ref={dialogRef}
        className="c25k-badge-modal m-auto w-[min(90vw,24rem)] overflow-visible bg-transparent p-2"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close badges"
            className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background shadow-md"
          >
            <Close className="h-4 w-4" />
          </button>
          <div className="max-h-[80vh] overflow-y-auto rounded-2xl">
            <BadgeRack badges={badges} />
          </div>
        </div>
      </dialog>
    </>
  );
}

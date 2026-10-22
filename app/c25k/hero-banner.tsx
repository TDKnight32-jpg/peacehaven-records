import Image from "next/image";
import type { ReactNode } from "react";

/** The hero banner's photo is deliberately a placeholder for now — there's
 * no real club photography sorted for C25K yet (see the brand-alignment
 * pass this was built from: Option A, matching the real site's use of
 * authentic member photography rather than illustration). To drop a real
 * photo in later: add the image to public/ (e.g. public/c25k-hero.jpg)
 * and pass its path as `photoSrc` from app/c25k/page.tsx — the dark
 * overlay (so the heading stays readable over a photo), rounded corners,
 * and sizing are already set up to just work once that's provided. */
export function HeroBanner({ photoSrc, children }: { photoSrc?: string; children: ReactNode }) {
  return (
    <div className="relative mb-8 flex h-56 w-full items-center justify-center overflow-hidden rounded-2xl bg-[#223b2e] sm:h-64">
      {photoSrc ? (
        <>
          <Image src={photoSrc} alt="" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-[#1a2e23]/55" />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-3 rounded-xl border-2 border-dashed border-white/25" />
      )}

      <div className="relative px-4 text-center">{children}</div>

      {!photoSrc && (
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[11px] font-medium text-white/50">
          Photo coming soon
        </span>
      )}
    </div>
  );
}

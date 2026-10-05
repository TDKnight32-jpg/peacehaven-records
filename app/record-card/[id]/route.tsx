import type { NextRequest } from "next/server";
import { getNewRecord } from "@/lib/record-highlights";
import { renderRecordCard } from "@/lib/record-card-image";
import { RECORD_CARD_SIZE, RECORD_CARD_THUMB_SIZE } from "@/lib/record-card-size";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });

// The share image for a record approved through the site. Everything on it
// comes from the database by ID — nothing from the URL — so nobody can make
// a card for a record that doesn't exist. Only submissions that were approved
// and took a #1 (the ones the Latest records strip shows) have a card;
// anything else is a 404.
//
// Full size (1080x1080) by default, for sharing and downloading;
// ?size=480 is the smaller version the strip shows. No other sizes.
export async function GET(request: NextRequest, ctx: RouteContext<"/record-card/[id]">) {
  const sizeParam = request.nextUrl.searchParams.get("size");
  if (sizeParam !== null && sizeParam !== String(RECORD_CARD_THUMB_SIZE)) return notFound();
  const size = sizeParam ? RECORD_CARD_THUMB_SIZE : RECORD_CARD_SIZE;

  const { id } = await ctx.params;
  const record = await getNewRecord(id);
  if (!record) return notFound();

  return renderRecordCard(record, {
    size,
    headers: {
      // An approved record doesn't change, but keep it short so a corrected
      // record (e.g. after a sheet re-import) isn't stuck in caches for long.
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="peacehaven-record-${record.id}.png"`,
    },
  });
}

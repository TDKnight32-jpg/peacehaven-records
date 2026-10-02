import { get } from "@vercel/blob";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { isOfficial } from "@/lib/officials-auth";

// Results photos live in a private Blob store; this is the only way to view
// one, and only with an officials session. Never cached — the photo is
// deleted once the submission is decided.
export async function GET(request: NextRequest, ctx: RouteContext<"/officials/photo/[id]">) {
  if (!(await isOfficial())) return new Response("Not logged in", { status: 401 });

  const { id } = await ctx.params;
  const submission = await prisma.recordSubmission.findUnique({ where: { id }, select: { photoUrl: true } });
  if (!submission?.photoUrl) return new Response("No photo", { status: 404 });

  const photo = await get(submission.photoUrl, { access: "private" });
  if (!photo || photo.statusCode !== 200) return new Response("No photo", { status: 404 });

  const ext = submission.photoUrl.split(".").pop();
  const download = request.nextUrl.searchParams.has("download");
  return new Response(photo.stream, {
    headers: {
      "Content-Type": photo.blob.contentType,
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="result-${id}.${ext}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

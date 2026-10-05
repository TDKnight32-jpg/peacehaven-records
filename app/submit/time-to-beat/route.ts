import type { NextRequest } from "next/server";
import { getTimeToBeat } from "@/lib/record-highlights";

// The /submit form asks this as the submitter picks distance, gender and age
// category. A GET route rather than a server action: it's a read, and
// server actions run one at a time. Never cached — records change whenever
// an official approves a submission.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const distance = params.get("distance") ?? "";
  const gender = params.get("gender");
  const ageCategory = params.get("ageCategory") ?? "";
  if (!distance || !ageCategory || (gender !== "M" && gender !== "F")) {
    return Response.json({ error: "distance, gender and ageCategory are required" }, { status: 400 });
  }

  const result = await getTimeToBeat(distance, gender, ageCategory);
  if (!result) return Response.json({ error: "Unknown distance" }, { status: 404 });
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}

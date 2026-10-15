import type { Distance, RecordEntry } from "@prisma/client";
import { prisma } from "../lib/db";
import { performanceText } from "../lib/record-approval";
import { performanceScore } from "../lib/record-ranking";
import { normalizeWhitespace } from "../lib/text";

/**
 * Merges two spellings of one athlete on the club records, e.g. "Sam Barden"
 * and "Samantha Barden". The record lists match athletes by name, so two
 * spellings count as two people and can hold two places in the same list.
 *
 *   npx tsx scripts/merge-athlete.ts "<name to replace>" "<name to keep>"           (preview only)
 *   npx tsx scripts/merge-athlete.ts "<name to replace>" "<name to keep>" --apply   (writes)
 *
 * In every record list, history and submission, the replaced name becomes
 * the kept one. Where that leaves the athlete twice in one list, only their
 * best performance stays (on a tie, the higher place) and everyone below
 * moves up, leaving the bottom slot empty. Someone who was pushed off that
 * list in the past isn't brought back automatically — check the history and
 * submissions and add them by hand if they belong there. Grand Prix runners
 * are not touched. Run `npm run backup-db` first.
 */
async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const [from, into] = args.filter((a) => a !== "--apply");
  if (!from || !into) throw new Error('Usage: npx tsx scripts/merge-athlete.ts "<name to replace>" "<name to keep>" [--apply]');
  const same = (name: string | null, target: string) => !!name && normalizeWhitespace(name) === normalizeWhitespace(target);

  const host = new URL(process.env.DATABASE_URL ?? "postgres://unknown").host;
  console.log(`${apply ? "APPLYING" : "Preview (nothing is written)"} — "${from}" → "${into}" on ${host}\n`);

  await prisma.$transaction(async (tx) => {
    const entries = await tx.recordEntry.findMany({ include: { distance: true }, orderBy: { rank: "asc" } });
    const lists = new Map<string, (RecordEntry & { distance: Distance })[]>();
    for (const e of entries) {
      const key = [e.distance.sortOrder, e.distanceId, e.gender, e.recordType, e.ageCategory].join("|");
      lists.set(key, [...(lists.get(key) ?? []), e]);
    }

    for (const [, list] of [...lists].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) {
      if (!list.some((e) => same(e.name, from))) continue;
      const { distance, gender, recordType, ageCategory } = list[0];
      const unit = distance.unit as "time" | "laps";
      const label = `${gender === "F" ? "Women's" : "Men's"} ${recordType === "OVERALL" ? "Overall" : ageCategory} ${distance.name}`;
      const show = (e: { rank: number; name: string | null; time: string | null; laps: number | null; event: string | null }) =>
        `  #${e.rank} ${e.name ?? "(empty)"}${e.name ? ` — ${performanceText(unit, e)}, ${e.event ?? ""}` : ""}`;

      // The athlete's entries under either name; the best one stays.
      const theirs = list.filter((e) => same(e.name, from) || same(e.name, into));
      const keep = theirs.reduce((best, e) =>
        performanceScore(unit, e) < performanceScore(unit, best) ? e : best,
      );
      const after = list
        .filter((e) => e.name && (e === keep || !theirs.includes(e)))
        .map((e, i) => ({ ...e, rank: i + 1, name: e === keep ? into : e.name }));

      console.log(`${label}\n before:`);
      list.forEach((e) => console.log(show(e)));
      console.log(" after:");
      after.forEach((e) => console.log(show(e)));
      for (let rank = after.length + 1; rank <= list.filter((e) => e.name).length; rank++)
        console.log(`  #${rank} (empty — removed)`);
      console.log();

      if (!apply) continue;
      // Clear the old slots, then write the list back top-down, so no two
      // rows ever share a rank.
      await tx.recordEntry.deleteMany({ where: { id: { in: list.filter((e) => e.name).map((e) => e.id) } } });
      for (const e of after) {
        await tx.recordEntry.create({
          data: {
            distanceId: e.distanceId, gender: e.gender, recordType: e.recordType, ageCategory: e.ageCategory,
            rank: e.rank, name: e.name, time: e.time, laps: e.laps, event: e.event, date: e.date, footnoteId: e.footnoteId,
          },
        });
      }
    }

    const history = (await tx.recordHistoryEntry.findMany({ include: { distance: true }, orderBy: { order: "asc" } }))
      .filter((h) => same(h.name, from));
    console.log(`History entries renamed: ${history.length}`);
    for (const h of history) {
      console.log(`  ${h.gender} ${h.recordType === "OVERALL" ? "Overall" : h.ageCategory} ${h.distance.name} #${h.order} — ${performanceText(h.distance.unit, h)}`);
    }
    const submissions = (await tx.recordSubmission.findMany({ include: { distance: true } })).filter((s) => same(s.athleteName, from));
    console.log(`Submissions renamed: ${submissions.length}`);
    for (const s of submissions) console.log(`  ${s.distance.name} — ${performanceText(s.distance.unit, s)} (${s.status})`);

    if (apply) {
      await tx.recordHistoryEntry.updateMany({ where: { id: { in: history.map((h) => h.id) } }, data: { name: into } });
      await tx.recordSubmission.updateMany({ where: { id: { in: submissions.map((s) => s.id) } }, data: { athleteName: into } });
      console.log("\nDone.");
    }
  }, { timeout: 60_000 });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

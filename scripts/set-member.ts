import { prisma } from "../lib/db";

/**
 * Marks a runner as having left the club (or rejoined). A former member is
 * left out of the overall GP leaderboard and news ticker, but none of their
 * results are touched — they still show on event pages (with Club Pos) and
 * on their own runner page. See Runner.isFormerMember in prisma/schema.prisma.
 *
 *   npm run set-member -- <runner-slug> left
 *   npm run set-member -- <runner-slug> rejoined
 *   npm run set-member -- --list
 *
 * The runner's slug is the last part of their runner page address, e.g.
 * /runners/sarah-isaacs -> sarah-isaacs.
 */
async function main() {
  const [slugOrFlag, action] = process.argv.slice(2);

  if (slugOrFlag === "--list") {
    const former = await prisma.runner.findMany({ where: { isFormerMember: true }, orderBy: { name: "asc" } });
    console.log(former.length === 0 ? "No former members." : "Former members:");
    for (const r of former) console.log(`  ${r.name} (slug: ${r.slug})`);
    return;
  }

  if (!slugOrFlag || (action !== "left" && action !== "rejoined")) {
    throw new Error("Usage: npm run set-member -- <runner-slug> left|rejoined   (or: npm run set-member -- --list)");
  }

  const runner = await prisma.runner.findUnique({
    where: { slug: slugOrFlag },
    include: { _count: { select: { results: true } } },
  });
  if (!runner) throw new Error(`No runner with slug "${slugOrFlag}" — check the address of their runner page.`);

  const isFormerMember = action === "left";
  if (runner.isFormerMember === isFormerMember) {
    console.log(`${runner.name} is already marked as ${isFormerMember ? "a former member" : "a current member"} — nothing changed.`);
    return;
  }

  await prisma.runner.update({ where: { id: runner.id }, data: { isFormerMember } });
  console.log(
    isFormerMember
      ? `${runner.name} is now a former member: left out of the overall leaderboard and news ticker. Their ${runner._count.results} result(s) are unchanged.`
      : `${runner.name} is a current member again: back on the overall leaderboard and news ticker.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

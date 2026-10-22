// Seeds the fixed catalog of C25K badges (see lib/c25k-badges.ts). Safe to
// re-run — each row is upserted by its slug, so editing a badge's name or
// description in BADGE_DEFINITIONS and re-running this updates it in place
// rather than creating a duplicate.
import { prisma } from "../lib/db";
import { BADGE_DEFINITIONS } from "../lib/c25k-badges";

async function main() {
  for (const def of BADGE_DEFINITIONS) {
    await prisma.badge.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
        description: def.description,
        criteria: def.description,
        kind: def.kind,
        threshold: def.threshold,
      },
      create: {
        slug: def.slug,
        name: def.name,
        description: def.description,
        criteria: def.description,
        kind: def.kind,
        threshold: def.threshold,
      },
    });
  }

  console.log(`Seeded ${BADGE_DEFINITIONS.length} badges.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

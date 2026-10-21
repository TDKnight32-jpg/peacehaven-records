// Lists every runner enrolled in the current cohort along with their
// personal login link, so they can be copied into a welcome email sent
// manually. Read-only — enrolling a runner (adding a CohortRunner row) is
// still a manual step done via Prisma Studio; this just surfaces the links
// afterward.
import { prisma } from "../lib/db";
import { getCurrentCohort } from "../lib/c25k";

const BASE_URL = "https://c25k.peacehavenrunclub.com";

async function main() {
  const cohort = await getCurrentCohort();
  if (!cohort) {
    console.log("No cohort exists yet — add one via Prisma Studio (the Cohort table) first.");
    return;
  }

  const enrollments = await prisma.cohortRunner.findMany({
    where: { cohortId: cohort.id },
    include: { runner: true },
    orderBy: { runner: { name: "asc" } },
  });

  if (enrollments.length === 0) {
    console.log(
      `No runners are enrolled in "${cohort.name}" yet — add rows to the CohortRunner table (via Prisma Studio, ` +
        `\`npx prisma studio\`) to generate their personal links.`,
    );
    return;
  }

  console.log(`Personal login links — ${cohort.name} (${enrollments.length} runner(s)):\n`);
  for (const enrollment of enrollments) {
    const contact = enrollment.runner.email ? ` <${enrollment.runner.email}>` : "";
    console.log(`${enrollment.runner.name}${contact}\n  ${BASE_URL}/enter/${enrollment.token}\n`);
  }
}

main().finally(() => prisma.$disconnect());

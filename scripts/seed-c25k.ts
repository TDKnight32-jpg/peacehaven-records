// Seeds the (shared, reused-every-year) 9-week Couch to 5K plan content, plus
// one starter Cohort so the section has something to show end to end. Safe
// to re-run — everything is upserted by its natural key.
import { prisma } from "../lib/db";

interface SessionSeed {
  dayLabel: string;
  description: string;
}

interface WeekSeed {
  weekNumber: number;
  title: string;
  description: string;
  sessions: SessionSeed[];
}

const WALK_WARMUP = "Start with a brisk 5-minute walk to warm up.";

const WEEKS: WeekSeed[] = [
  {
    weekNumber: 1,
    title: "Getting started",
    description: `${WALK_WARMUP} Then alternate 60 seconds of jogging and 90 seconds of walking, for a total of 20 minutes.`,
    sessions: [1, 2, 3].map((n) => ({
      dayLabel: `Day ${n}`,
      description: "60 sec jog / 90 sec walk, repeated for 20 minutes.",
    })),
  },
  {
    weekNumber: 2,
    title: "Building the habit",
    description: `${WALK_WARMUP} Then alternate 90 seconds of jogging and 2 minutes of walking, for a total of 20 minutes.`,
    sessions: [1, 2, 3].map((n) => ({
      dayLabel: `Day ${n}`,
      description: "90 sec jog / 2 min walk, repeated for 20 minutes.",
    })),
  },
  {
    weekNumber: 3,
    title: "Longer intervals",
    description: `${WALK_WARMUP} Then do two repetitions of: 90 sec jog, 90 sec walk, 3 min jog, 3 min walk.`,
    sessions: [1, 2, 3].map((n) => ({
      dayLabel: `Day ${n}`,
      description: "Two reps of: 90 sec jog, 90 sec walk, 3 min jog, 3 min walk.",
    })),
  },
  {
    weekNumber: 4,
    title: "Pushing further",
    description: `${WALK_WARMUP} Then: 3 min jog, 90 sec walk, 5 min jog, 2.5 min walk, 3 min jog, 90 sec walk, 5 min jog.`,
    sessions: [1, 2, 3].map((n) => ({
      dayLabel: `Day ${n}`,
      description: "3 min jog, 90 sec walk, 5 min jog, 2.5 min walk, 3 min jog, 90 sec walk, 5 min jog.",
    })),
  },
  {
    weekNumber: 5,
    title: "First continuous runs",
    description: `${WALK_WARMUP} Sessions get progressively longer this week, building toward 20 minutes of continuous jogging.`,
    sessions: [
      { dayLabel: "Day 1", description: "Three reps of: 5 min jog, 3 min walk." },
      { dayLabel: "Day 2", description: "8 min jog, 5 min walk, 8 min jog." },
      { dayLabel: "Day 3", description: "20 minutes of continuous jogging — no walking." },
    ],
  },
  {
    weekNumber: 6,
    title: "Building endurance",
    description: `${WALK_WARMUP} Sessions build toward 25 minutes of continuous jogging.`,
    sessions: [
      { dayLabel: "Day 1", description: "5 min jog, 3 min walk, 8 min jog, 3 min walk, 5 min jog." },
      { dayLabel: "Day 2", description: "10 min jog, 3 min walk, 10 min jog." },
      { dayLabel: "Day 3", description: "25 minutes of continuous jogging — no walking." },
    ],
  },
  {
    weekNumber: 7,
    title: "25 minutes, three times",
    description: `${WALK_WARMUP} Then jog continuously for 25 minutes. Repeat this session three times this week.`,
    sessions: [1, 2, 3].map((n) => ({
      dayLabel: `Day ${n}`,
      description: "25 minutes of continuous jogging.",
    })),
  },
  {
    weekNumber: 8,
    title: "28 minutes, three times",
    description: `${WALK_WARMUP} Then jog continuously for 28 minutes. Repeat this session three times this week.`,
    sessions: [1, 2, 3].map((n) => ({
      dayLabel: `Day ${n}`,
      description: "28 minutes of continuous jogging.",
    })),
  },
  {
    weekNumber: 9,
    title: "Graduation — 5K",
    description: `${WALK_WARMUP} Then jog continuously for 30 minutes (or a full 5K, whichever comes first). Repeat this session three times this week — the last one is your first 5K!`,
    sessions: [1, 2, 3].map((n) => ({
      dayLabel: `Day ${n}`,
      description: "30 minutes of continuous jogging, or 5K — whichever comes first.",
    })),
  },
];

async function main() {
  for (const week of WEEKS) {
    const created = await prisma.c25kWeek.upsert({
      where: { weekNumber: week.weekNumber },
      update: { title: week.title, description: week.description },
      create: { weekNumber: week.weekNumber, title: week.title, description: week.description },
    });

    for (const [i, session] of week.sessions.entries()) {
      const order = i + 1;
      await prisma.c25kSession.upsert({
        where: { weekId_order: { weekId: created.id, order } },
        update: { dayLabel: session.dayLabel, description: session.description },
        create: { weekId: created.id, order, dayLabel: session.dayLabel, description: session.description },
      });
    }
  }

  const existingCohort = await prisma.cohort.findFirst({ where: { name: "January 2027" } });
  if (!existingCohort) {
    await prisma.cohort.create({
      data: { year: 2027, name: "January 2027", startDate: new Date("2027-01-05") },
    });
  }

  console.log(`Seeded ${WEEKS.length} weeks (${WEEKS.reduce((n, w) => n + w.sessions.length, 0)} sessions) and ensured the starter cohort exists.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

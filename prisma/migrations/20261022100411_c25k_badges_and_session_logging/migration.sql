-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('SOLO', 'GROUP');

-- CreateEnum
CREATE TYPE "BadgeKind" AS ENUM ('FIRST_RUN', 'FIRST_SOLO_RUN', 'WEEKLY_COMPLETE', 'SESSION_COUNT', 'TIME_TOTAL', 'EARLY_BIRD', 'NIGHT_OWL', 'PERFECT_WEEK');

-- AlterTable
ALTER TABLE "Badge" ADD COLUMN     "kind" "BadgeKind" NOT NULL,
ADD COLUMN     "slug" TEXT NOT NULL,
ADD COLUMN     "threshold" INTEGER;

-- AlterTable
ALTER TABLE "RunnerProgress" ADD COLUMN     "completed" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "sessionType" "SessionType",
ADD COLUMN     "timeOfDay" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Badge_slug_key" ON "Badge"("slug");


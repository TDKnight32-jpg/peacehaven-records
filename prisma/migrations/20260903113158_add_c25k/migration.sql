-- AlterTable
ALTER TABLE "Runner" ADD COLUMN     "email" TEXT;

-- CreateTable
CREATE TABLE "Cohort" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "C25kWeek" (
    "id" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "C25kWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "C25kSession" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "dayLabel" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "C25kSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerProgress" (
    "id" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunnerProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "criteria" TEXT NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunnerBadge" (
    "id" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunnerBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "C25kWeek_weekNumber_key" ON "C25kWeek"("weekNumber");

-- CreateIndex
CREATE UNIQUE INDEX "C25kSession_weekId_order_key" ON "C25kSession"("weekId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "RunnerProgress_runnerId_cohortId_sessionId_key" ON "RunnerProgress"("runnerId", "cohortId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "RunnerBadge_runnerId_badgeId_cohortId_key" ON "RunnerBadge"("runnerId", "badgeId", "cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_token_key" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Runner_email_key" ON "Runner"("email");

-- AddForeignKey
ALTER TABLE "C25kSession" ADD CONSTRAINT "C25kSession_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "C25kWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerProgress" ADD CONSTRAINT "RunnerProgress_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "Runner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerProgress" ADD CONSTRAINT "RunnerProgress_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerProgress" ADD CONSTRAINT "RunnerProgress_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "C25kSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerBadge" ADD CONSTRAINT "RunnerBadge_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "Runner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerBadge" ADD CONSTRAINT "RunnerBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunnerBadge" ADD CONSTRAINT "RunnerBadge_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicLinkToken" ADD CONSTRAINT "MagicLinkToken_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "Runner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "Runner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


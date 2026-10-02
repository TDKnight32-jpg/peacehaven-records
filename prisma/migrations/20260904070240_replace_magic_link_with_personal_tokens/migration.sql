-- DropForeignKey
ALTER TABLE "MagicLinkToken" DROP CONSTRAINT "MagicLinkToken_runnerId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_runnerId_fkey";

-- DropTable
DROP TABLE "MagicLinkToken";

-- DropTable
DROP TABLE "Session";

-- CreateTable
CREATE TABLE "CohortRunner" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CohortRunner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CohortRunner_token_key" ON "CohortRunner"("token");

-- CreateIndex
CREATE UNIQUE INDEX "CohortRunner_cohortId_runnerId_key" ON "CohortRunner"("cohortId", "runnerId");

-- AddForeignKey
ALTER TABLE "CohortRunner" ADD CONSTRAINT "CohortRunner_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "Cohort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CohortRunner" ADD CONSTRAINT "CohortRunner_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "Runner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


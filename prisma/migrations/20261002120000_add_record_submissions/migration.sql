-- CreateTable
CREATE TABLE "RecordSubmission" (
    "id" TEXT NOT NULL,
    "distanceId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "ageCategory" TEXT NOT NULL,
    "time" TEXT,
    "laps" INTEGER,
    "athleteName" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "email" TEXT NOT NULL,
    "resultsUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RecordSubmission_status_submittedAt_idx" ON "RecordSubmission"("status", "submittedAt");

-- AddForeignKey
ALTER TABLE "RecordSubmission" ADD CONSTRAINT "RecordSubmission_distanceId_fkey" FOREIGN KEY ("distanceId") REFERENCES "Distance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


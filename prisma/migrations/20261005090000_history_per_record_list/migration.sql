-- DropIndex
DROP INDEX "RecordHistoryEntry_distanceId_gender_order_key";

-- AlterTable
ALTER TABLE "RecordHistoryEntry" ADD COLUMN     "ageCategory" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "laps" INTEGER,
ADD COLUMN     "recordType" TEXT NOT NULL DEFAULT 'OVERALL',
ALTER COLUMN "time" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "RecordHistoryEntry_distanceId_gender_recordType_ageCategory_key" ON "RecordHistoryEntry"("distanceId", "gender", "recordType", "ageCategory", "order");


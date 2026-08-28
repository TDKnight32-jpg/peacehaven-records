-- CreateTable
CREATE TABLE "RecordHistoryEntry" (
    "id" TEXT NOT NULL,
    "distanceId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "event" TEXT,
    "date" TIMESTAMP(3),

    CONSTRAINT "RecordHistoryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RecordHistoryEntry_distanceId_gender_order_key" ON "RecordHistoryEntry"("distanceId", "gender", "order");

-- AddForeignKey
ALTER TABLE "RecordHistoryEntry" ADD CONSTRAINT "RecordHistoryEntry_distanceId_fkey" FOREIGN KEY ("distanceId") REFERENCES "Distance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Distance" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "Distance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordEntry" (
    "id" TEXT NOT NULL,
    "distanceId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "ageCategory" TEXT NOT NULL DEFAULT '',
    "rank" INTEGER NOT NULL,
    "name" TEXT,
    "time" TEXT,
    "laps" INTEGER,
    "event" TEXT,
    "date" TIMESTAMP(3),
    "footnoteId" TEXT,

    CONSTRAINT "RecordEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Footnote" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "Footnote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Distance_slug_key" ON "Distance"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RecordEntry_distanceId_gender_recordType_ageCategory_rank_key" ON "RecordEntry"("distanceId", "gender", "recordType", "ageCategory", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Footnote_text_key" ON "Footnote"("text");

-- AddForeignKey
ALTER TABLE "RecordEntry" ADD CONSTRAINT "RecordEntry_distanceId_fkey" FOREIGN KEY ("distanceId") REFERENCES "Distance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordEntry" ADD CONSTRAINT "RecordEntry_footnoteId_fkey" FOREIGN KEY ("footnoteId") REFERENCES "Footnote"("id") ON DELETE SET NULL ON UPDATE CASCADE;

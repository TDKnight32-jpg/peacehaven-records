-- CreateTable
CREATE TABLE "Distance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "RecordEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "distanceId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "ageCategory" TEXT NOT NULL DEFAULT '',
    "rank" INTEGER NOT NULL,
    "name" TEXT,
    "time" TEXT,
    "laps" INTEGER,
    "event" TEXT,
    "date" DATETIME,
    "footnoteId" TEXT,
    CONSTRAINT "RecordEntry_distanceId_fkey" FOREIGN KEY ("distanceId") REFERENCES "Distance" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RecordEntry_footnoteId_fkey" FOREIGN KEY ("footnoteId") REFERENCES "Footnote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Footnote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "symbol" TEXT NOT NULL,
    "text" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Distance_slug_key" ON "Distance"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RecordEntry_distanceId_gender_recordType_ageCategory_rank_key" ON "RecordEntry"("distanceId", "gender", "recordType", "ageCategory", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "Footnote_text_key" ON "Footnote"("text");

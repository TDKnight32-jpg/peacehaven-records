-- CreateTable
CREATE TABLE "Runner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Runner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "distanceId" TEXT,
    "scoringType" TEXT NOT NULL,
    "isSussexGp" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "GpEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GpResult" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "runnerId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "result" TEXT,
    "rawTime" TEXT,
    "predictedTime" TEXT,
    "position" INTEGER,
    "points" INTEGER,
    "isVolunteer" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GpResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Runner_slug_key" ON "Runner"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GpEvent_slug_key" ON "GpEvent"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "GpResult_eventId_runnerId_category_key" ON "GpResult"("eventId", "runnerId", "category");

-- AddForeignKey
ALTER TABLE "GpEvent" ADD CONSTRAINT "GpEvent_distanceId_fkey" FOREIGN KEY ("distanceId") REFERENCES "Distance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpResult" ADD CONSTRAINT "GpResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "GpEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GpResult" ADD CONSTRAINT "GpResult_runnerId_fkey" FOREIGN KEY ("runnerId") REFERENCES "Runner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

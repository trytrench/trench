/*
  Warnings:

  - You are about to drop the `ProductionDataset` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ProductionDataset" DROP CONSTRAINT "ProductionDataset_datasetId_fkey";

-- DropTable
DROP TABLE "ProductionDataset";

-- CreateTable
CREATE TABLE "OutputLog" (
    "id" BIGSERIAL NOT NULL,
    "eventId" TEXT NOT NULL,
    "datasetId" BIGINT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "OutputLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutputLogCursor" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "latestOutputLogId" BIGINT,

    CONSTRAINT "OutputLogCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionDatasetLog" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "datasetId" BIGINT NOT NULL,

    CONSTRAINT "ProductionDatasetLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetJob" (
    "datasetId" BIGINT NOT NULL,

    CONSTRAINT "DatasetJob_pkey" PRIMARY KEY ("datasetId")
);

-- CreateIndex
CREATE UNIQUE INDEX "OutputLog_eventId_datasetId_key" ON "OutputLog"("eventId", "datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "OutputLogCursor_latestOutputLogId_key" ON "OutputLogCursor"("latestOutputLogId");

-- AddForeignKey
ALTER TABLE "OutputLogCursor" ADD CONSTRAINT "OutputLogCursor_latestOutputLogId_fkey" FOREIGN KEY ("latestOutputLogId") REFERENCES "OutputLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionDatasetLog" ADD CONSTRAINT "ProductionDatasetLog_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetJob" ADD CONSTRAINT "DatasetJob_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

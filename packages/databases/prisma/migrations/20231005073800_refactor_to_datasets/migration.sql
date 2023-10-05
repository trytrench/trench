/*
  Warnings:

  - You are about to drop the `BackfillJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductionRuleset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ruleset` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BackfillJob" DROP CONSTRAINT "BackfillJob_lastEventId_fkey";

-- DropForeignKey
ALTER TABLE "BackfillJob" DROP CONSTRAINT "BackfillJob_rulesetId_fkey";

-- DropForeignKey
ALTER TABLE "ProductionRuleset" DROP CONSTRAINT "ProductionRuleset_rulesetId_fkey";

-- DropTable
DROP TABLE "BackfillJob";

-- DropTable
DROP TABLE "ProductionRuleset";

-- DropTable
DROP TABLE "Ruleset";

-- CreateTable
CREATE TABLE "ProductionDataset" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "datasetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ProductionDataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "backfillFrom" TIMESTAMP(3),
    "backfillTo" TIMESTAMP(3),
    "lastEventLogId" TEXT,
    "isProduction" BOOLEAN NOT NULL DEFAULT false,
    "files" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ProductionDataset" ADD CONSTRAINT "ProductionDataset_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_lastEventLogId_fkey" FOREIGN KEY ("lastEventLogId") REFERENCES "EventLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

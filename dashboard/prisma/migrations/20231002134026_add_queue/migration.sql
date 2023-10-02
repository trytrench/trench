/*
  Warnings:

  - You are about to drop the column `version` on the `FileSnapshot` table. All the data in the column will be lost.
  - Added the required column `rulesetId` to the `FileSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FileSnapshot" DROP COLUMN "version",
ADD COLUMN     "rulesetId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackfillJob" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rulesetId" TEXT NOT NULL,
    "lastEventId" TEXT NOT NULL,

    CONSTRAINT "BackfillJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionRuleset" (
    "rulesetId" TEXT NOT NULL,

    CONSTRAINT "ProductionRuleset_pkey" PRIMARY KEY ("rulesetId")
);

-- CreateTable
CREATE TABLE "Ruleset" (
    "rulesetId" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Ruleset_pkey" PRIMARY KEY ("rulesetId")
);

-- CreateIndex
CREATE INDEX "EventLog_timestamp_idx" ON "EventLog"("timestamp");

-- AddForeignKey
ALTER TABLE "BackfillJob" ADD CONSTRAINT "BackfillJob_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("rulesetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackfillJob" ADD CONSTRAINT "BackfillJob_lastEventId_fkey" FOREIGN KEY ("lastEventId") REFERENCES "EventLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRuleset" ADD CONSTRAINT "ProductionRuleset_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("rulesetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FileSnapshot" ADD CONSTRAINT "FileSnapshot_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("rulesetId") ON DELETE RESTRICT ON UPDATE CASCADE;

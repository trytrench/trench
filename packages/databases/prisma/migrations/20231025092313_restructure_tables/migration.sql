/*
  Warnings:

  - You are about to drop the column `backfillFrom` on the `Dataset` table. All the data in the column will be lost.
  - You are about to drop the column `backfillTo` on the `Dataset` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Dataset` table. All the data in the column will be lost.
  - You are about to drop the column `lastEventLogId` on the `Dataset` table. All the data in the column will be lost.
  - You are about to drop the column `releaseId` on the `Dataset` table. All the data in the column will be lost.
  - You are about to drop the column `code` on the `Release` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Release` table. All the data in the column will be lost.
  - You are about to drop the column `isDraft` on the `Release` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `Release` table. All the data in the column will be lost.
  - Added the required column `versionId` to the `Release` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ConsumerJobType" AS ENUM ('BACKFILL', 'LIVE');

-- CreateEnum
CREATE TYPE "ConsumerJobStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED');

-- DropForeignKey
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_lastEventLogId_fkey";

-- DropForeignKey
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_releaseId_fkey";

-- AlterTable
ALTER TABLE "Dataset" DROP COLUMN "backfillFrom",
DROP COLUMN "backfillTo",
DROP COLUMN "description",
DROP COLUMN "lastEventLogId",
DROP COLUMN "releaseId";

-- AlterTable
ALTER TABLE "EventLog" ADD COLUMN     "options" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "Release" DROP COLUMN "code",
DROP COLUMN "description",
DROP COLUMN "isDraft",
DROP COLUMN "version",
ADD COLUMN     "versionId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Version" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "code" JSONB NOT NULL,
    "version" TEXT NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "Version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Backtest" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "datasetId" BIGINT NOT NULL,
    "description" TEXT,
    "backfillFrom" TIMESTAMP(3),
    "backfillTo" TIMESTAMP(3),
    "versionId" TEXT NOT NULL,

    CONSTRAINT "Backtest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsumerJob" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "lastEventLogId" TEXT,
    "type" "ConsumerJobType" NOT NULL,
    "status" "ConsumerJobStatus" NOT NULL,
    "backtestId" TEXT,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "ConsumerJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerJob_backtestId_key" ON "ConsumerJob"("backtestId");

-- AddForeignKey
ALTER TABLE "Release" ADD CONSTRAINT "Release_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Version" ADD CONSTRAINT "Version_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backtest" ADD CONSTRAINT "Backtest_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Backtest" ADD CONSTRAINT "Backtest_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerJob" ADD CONSTRAINT "ConsumerJob_lastEventLogId_fkey" FOREIGN KEY ("lastEventLogId") REFERENCES "EventLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerJob" ADD CONSTRAINT "ConsumerJob_backtestId_fkey" FOREIGN KEY ("backtestId") REFERENCES "Backtest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerJob" ADD CONSTRAINT "ConsumerJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

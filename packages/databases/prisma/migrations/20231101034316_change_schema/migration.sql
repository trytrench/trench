/*
  Warnings:

  - You are about to drop the column `prodDatasetId` on the `Project` table. All the data in the column will be lost.
  - You are about to drop the `Backtest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConsumerJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeatureMetadata` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Release` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Version` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[currentEventHandlerAssignmentId]` on the table `Dataset` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[productionDatasetId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `name` to the `Dataset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Dataset` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Dataset` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DatasetType" AS ENUM ('PRODUCTION', 'BACKTEST');

-- DropForeignKey
ALTER TABLE "Backtest" DROP CONSTRAINT "Backtest_datasetId_fkey";

-- DropForeignKey
ALTER TABLE "Backtest" DROP CONSTRAINT "Backtest_versionId_fkey";

-- DropForeignKey
ALTER TABLE "ConsumerJob" DROP CONSTRAINT "ConsumerJob_backtestId_fkey";

-- DropForeignKey
ALTER TABLE "ConsumerJob" DROP CONSTRAINT "ConsumerJob_lastEventLogId_fkey";

-- DropForeignKey
ALTER TABLE "ConsumerJob" DROP CONSTRAINT "ConsumerJob_projectId_fkey";

-- DropForeignKey
ALTER TABLE "FeatureMetadata" DROP CONSTRAINT "FeatureMetadata_versionId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_prodDatasetId_fkey";

-- DropForeignKey
ALTER TABLE "Release" DROP CONSTRAINT "Release_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Release" DROP CONSTRAINT "Release_versionId_fkey";

-- DropForeignKey
ALTER TABLE "Version" DROP CONSTRAINT "Version_projectId_fkey";

-- DropIndex
DROP INDEX "Project_prodDatasetId_key";

-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN     "currentEventHandlerAssignmentId" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastEventLogId" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "type" "DatasetType" NOT NULL;

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "prodDatasetId",
ADD COLUMN     "productionDatasetId" BIGINT;

-- DropTable
DROP TABLE "Backtest";

-- DropTable
DROP TABLE "ConsumerJob";

-- DropTable
DROP TABLE "FeatureMetadata";

-- DropTable
DROP TABLE "Release";

-- DropTable
DROP TABLE "Version";

-- DropEnum
DROP TYPE "ConsumerJobStatus";

-- DropEnum
DROP TYPE "ConsumerJobType";

-- CreateTable
CREATE TABLE "EventHandler" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" JSONB NOT NULL,
    "description" TEXT,
    "version" TEXT NOT NULL,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "EventHandler_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventHandlerAssignment" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventHandlerId" TEXT NOT NULL,
    "datasetId" BIGINT NOT NULL,

    CONSTRAINT "EventHandlerAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityType" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "featureOrder" TEXT[],
    "datasetId" BIGINT NOT NULL,

    CONSTRAINT "EntityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventType" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "featureOrder" TEXT[],
    "datasetId" BIGINT NOT NULL,

    CONSTRAINT "EventType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityFeature" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "entityTypeId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "EntityFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventFeature" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "eventTypeId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "EventFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "feature" TEXT NOT NULL,
    "isRule" BOOLEAN NOT NULL,
    "dataType" TEXT NOT NULL DEFAULT 'text',
    "datasetId" BIGINT NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_currentEventHandlerAssignmentId_key" ON "Dataset"("currentEventHandlerAssignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Project_productionDatasetId_key" ON "Project"("productionDatasetId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_productionDatasetId_fkey" FOREIGN KEY ("productionDatasetId") REFERENCES "Dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHandler" ADD CONSTRAINT "EventHandler_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHandlerAssignment" ADD CONSTRAINT "EventHandlerAssignment_eventHandlerId_fkey" FOREIGN KEY ("eventHandlerId") REFERENCES "EventHandler"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventHandlerAssignment" ADD CONSTRAINT "EventHandlerAssignment_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_lastEventLogId_fkey" FOREIGN KEY ("lastEventLogId") REFERENCES "EventLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_currentEventHandlerAssignmentId_fkey" FOREIGN KEY ("currentEventHandlerAssignmentId") REFERENCES "EventHandlerAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityType" ADD CONSTRAINT "EntityType_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityFeature" ADD CONSTRAINT "EntityFeature_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "EntityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityFeature" ADD CONSTRAINT "EntityFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeature" ADD CONSTRAINT "EventFeature_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeature" ADD CONSTRAINT "EventFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

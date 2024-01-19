/*
  Warnings:

  - You are about to drop the column `featureOrder` on the `EntityType` table. All the data in the column will be lost.
  - You are about to drop the column `nameFeatureId` on the `EntityType` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `EntityType` table. All the data in the column will be lost.
  - You are about to drop the column `ruleOrder` on the `EntityType` table. All the data in the column will be lost.
  - You are about to drop the column `featureOrder` on the `EventType` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `EventType` table. All the data in the column will be lost.
  - You are about to drop the column `ruleOrder` on the `EventType` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `FeatureDef` table. All the data in the column will be lost.
  - You are about to drop the column `projectId` on the `FeatureDefSnapshot` table. All the data in the column will be lost.
  - You are about to drop the `Dataset` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EntityFeature` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventFeature` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventHandler` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventHandlerAssignment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Feature` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[type]` on the table `EntityType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[type]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_currentEventHandlerAssignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_lastEventLogId_fkey";

-- DropForeignKey
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_projectId_fkey";

-- DropForeignKey
ALTER TABLE "EntityFeature" DROP CONSTRAINT "EntityFeature_entityTypeId_fkey";

-- DropForeignKey
ALTER TABLE "EntityFeature" DROP CONSTRAINT "EntityFeature_featureId_fkey";

-- DropForeignKey
ALTER TABLE "EntityType" DROP CONSTRAINT "EntityType_nameFeatureId_fkey";

-- DropForeignKey
ALTER TABLE "EntityType" DROP CONSTRAINT "EntityType_projectId_fkey";

-- DropForeignKey
ALTER TABLE "EventFeature" DROP CONSTRAINT "EventFeature_eventType_fkey";

-- DropForeignKey
ALTER TABLE "EventFeature" DROP CONSTRAINT "EventFeature_featureId_fkey";

-- DropForeignKey
ALTER TABLE "EventHandler" DROP CONSTRAINT "EventHandler_projectId_fkey";

-- DropForeignKey
ALTER TABLE "EventHandlerAssignment" DROP CONSTRAINT "EventHandlerAssignment_datasetId_fkey";

-- DropForeignKey
ALTER TABLE "EventHandlerAssignment" DROP CONSTRAINT "EventHandlerAssignment_eventHandlerId_fkey";

-- DropForeignKey
ALTER TABLE "EventType" DROP CONSTRAINT "EventType_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Feature" DROP CONSTRAINT "Feature_projectId_fkey";

-- DropForeignKey
ALTER TABLE "FeatureDef" DROP CONSTRAINT "FeatureDef_projectId_fkey";

-- DropForeignKey
ALTER TABLE "FeatureDefSnapshot" DROP CONSTRAINT "FeatureDefSnapshot_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_productionDatasetId_fkey";

-- DropIndex
DROP INDEX "EntityType_nameFeatureId_key";

-- DropIndex
DROP INDEX "EntityType_type_projectId_key";

-- DropIndex
DROP INDEX "EventType_type_projectId_key";

-- AlterTable
ALTER TABLE "EntityType" DROP COLUMN "featureOrder",
DROP COLUMN "nameFeatureId",
DROP COLUMN "projectId",
DROP COLUMN "ruleOrder";

-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "featureOrder",
DROP COLUMN "projectId",
DROP COLUMN "ruleOrder";

-- AlterTable
ALTER TABLE "FeatureDef" DROP COLUMN "projectId";

-- AlterTable
ALTER TABLE "FeatureDefSnapshot" DROP COLUMN "projectId";

-- DropTable
DROP TABLE "Dataset";

-- DropTable
DROP TABLE "EntityFeature";

-- DropTable
DROP TABLE "EventFeature";

-- DropTable
DROP TABLE "EventHandler";

-- DropTable
DROP TABLE "EventHandlerAssignment";

-- DropTable
DROP TABLE "EventLog";

-- DropTable
DROP TABLE "Feature";

-- DropTable
DROP TABLE "Project";

-- DropEnum
DROP TYPE "DatasetType";

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListItem" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" TEXT NOT NULL,
    "listId" TEXT NOT NULL,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "List_alias_key" ON "List"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_value_key" ON "ListItem"("listId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "EntityType_type_key" ON "EntityType"("type");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_type_key" ON "EventType"("type");

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

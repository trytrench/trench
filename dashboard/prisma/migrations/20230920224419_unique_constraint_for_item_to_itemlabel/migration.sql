/*
  Warnings:

  - The primary key for the `EntityLabelToEntity` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `EntityLabelToEntity` table. All the data in the column will be lost.
  - The primary key for the `EntityLabelType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EventLabelToEvent` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EventLabelType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[name,entityType,labelType,datasetId]` on the table `EntityLabel` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name,eventType,labelType,datasetId]` on the table `EventLabel` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "EntityLabel" DROP CONSTRAINT "EntityLabel_labelType_fkey";

-- DropForeignKey
ALTER TABLE "EventLabel" DROP CONSTRAINT "EventLabel_labelType_fkey";

-- DropIndex
DROP INDEX "EntityLabel_name_entityType_labelType_key";

-- DropIndex
DROP INDEX "EventLabel_name_eventType_labelType_key";

-- AlterTable
ALTER TABLE "EntityLabelToEntity" DROP CONSTRAINT "EntityLabelToEntity_pkey",
DROP COLUMN "id",
ADD CONSTRAINT "EntityLabelToEntity_pkey" PRIMARY KEY ("entityLabelId", "entityId", "datasetId");

-- AlterTable
ALTER TABLE "EntityLabelType" DROP CONSTRAINT "EntityLabelType_pkey",
ADD CONSTRAINT "EntityLabelType_pkey" PRIMARY KEY ("id", "datasetId");

-- AlterTable
ALTER TABLE "EventLabelToEvent" DROP CONSTRAINT "EventLabelToEvent_pkey",
ADD CONSTRAINT "EventLabelToEvent_pkey" PRIMARY KEY ("eventLabelId", "eventId", "datasetId");

-- AlterTable
ALTER TABLE "EventLabelType" DROP CONSTRAINT "EventLabelType_pkey",
ADD CONSTRAINT "EventLabelType_pkey" PRIMARY KEY ("id", "datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityLabel_name_entityType_labelType_datasetId_key" ON "EntityLabel"("name", "entityType", "labelType", "datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "EventLabel_name_eventType_labelType_datasetId_key" ON "EventLabel"("name", "eventType", "labelType", "datasetId");

-- AddForeignKey
ALTER TABLE "EntityLabel" ADD CONSTRAINT "EntityLabel_labelType_datasetId_fkey" FOREIGN KEY ("labelType", "datasetId") REFERENCES "EntityLabelType"("id", "datasetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLabel" ADD CONSTRAINT "EventLabel_labelType_datasetId_fkey" FOREIGN KEY ("labelType", "datasetId") REFERENCES "EventLabelType"("id", "datasetId") ON DELETE RESTRICT ON UPDATE CASCADE;

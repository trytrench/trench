/*
  Warnings:

  - The primary key for the `EntityFeature` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EntityType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EventFeature` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `EventType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `LinkType` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `_EntityToEntityLabel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EventToEventLabel` table. If the table is not empty, all the data it contains will be lost.

*/

-- Drop the existing materialized views
DROP MATERIALIZED VIEW "EntityTimeBucketsMatView";
DROP MATERIALIZED VIEW "EntityLabelsTimeBucketsMatView";
DROP MATERIALIZED VIEW "EntityAppearancesMatView";


-- DropForeignKey
ALTER TABLE "Entity" DROP CONSTRAINT "Entity_type_fkey";

-- DropForeignKey
ALTER TABLE "EntityFeature" DROP CONSTRAINT "EntityFeature_entityType_fkey";

-- DropForeignKey
ALTER TABLE "EntityLabel" DROP CONSTRAINT "EntityLabel_entityType_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_type_fkey";

-- DropForeignKey
ALTER TABLE "EventFeature" DROP CONSTRAINT "EventFeature_eventType_fkey";

-- DropForeignKey
ALTER TABLE "EventLabel" DROP CONSTRAINT "EventLabel_eventType_fkey";

-- DropForeignKey
ALTER TABLE "EventToEntityLink" DROP CONSTRAINT "EventToEntityLink_type_fkey";

-- DropForeignKey
ALTER TABLE "_EntityToEntityLabel" DROP CONSTRAINT "_EntityToEntityLabel_A_fkey";

-- DropForeignKey
ALTER TABLE "_EntityToEntityLabel" DROP CONSTRAINT "_EntityToEntityLabel_B_fkey";

-- DropForeignKey
ALTER TABLE "_EventToEventLabel" DROP CONSTRAINT "_EventToEventLabel_A_fkey";

-- DropForeignKey
ALTER TABLE "_EventToEventLabel" DROP CONSTRAINT "_EventToEventLabel_B_fkey";

-- AlterTable
ALTER TABLE "EntityFeature" DROP CONSTRAINT "EntityFeature_pkey",
ADD CONSTRAINT "EntityFeature_pkey" PRIMARY KEY ("entityType", "name", "datasetId");

-- AlterTable
ALTER TABLE "EntityType" DROP CONSTRAINT "EntityType_pkey",
ADD CONSTRAINT "EntityType_pkey" PRIMARY KEY ("id", "datasetId");

-- AlterTable
ALTER TABLE "EventFeature" DROP CONSTRAINT "EventFeature_pkey",
ADD CONSTRAINT "EventFeature_pkey" PRIMARY KEY ("eventType", "name", "datasetId");

-- AlterTable
ALTER TABLE "EventType" DROP CONSTRAINT "EventType_pkey",
ADD CONSTRAINT "EventType_pkey" PRIMARY KEY ("id", "datasetId");

-- AlterTable
ALTER TABLE "LinkType" DROP CONSTRAINT "LinkType_pkey",
ADD CONSTRAINT "LinkType_pkey" PRIMARY KEY ("id", "datasetId");

-- DropTable
DROP TABLE "_EntityToEntityLabel";

-- DropTable
DROP TABLE "_EventToEventLabel";

-- CreateTable
CREATE TABLE "EventLabelToEvent" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "eventLabelId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "datasetId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventLabelToEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLabelToEntity" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "entityLabelId" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "datasetId" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EntityLabelToEntity_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_type_datasetId_fkey" FOREIGN KEY ("type", "datasetId") REFERENCES "EventType"("id", "datasetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeature" ADD CONSTRAINT "EventFeature_eventType_datasetId_fkey" FOREIGN KEY ("eventType", "datasetId") REFERENCES "EventType"("id", "datasetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityFeature" ADD CONSTRAINT "EntityFeature_entityType_datasetId_fkey" FOREIGN KEY ("entityType", "datasetId") REFERENCES "EntityType"("id", "datasetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_type_datasetId_fkey" FOREIGN KEY ("type", "datasetId") REFERENCES "EntityType"("id", "datasetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventToEntityLink" ADD CONSTRAINT "EventToEntityLink_type_datasetId_fkey" FOREIGN KEY ("type", "datasetId") REFERENCES "LinkType"("id", "datasetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLabel" ADD CONSTRAINT "EntityLabel_entityType_datasetId_fkey" FOREIGN KEY ("entityType", "datasetId") REFERENCES "EntityType"("id", "datasetId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLabelToEvent" ADD CONSTRAINT "EventLabelToEvent_eventLabelId_fkey" FOREIGN KEY ("eventLabelId") REFERENCES "EventLabel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLabelToEvent" ADD CONSTRAINT "EventLabelToEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLabelToEvent" ADD CONSTRAINT "EventLabelToEvent_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLabelToEntity" ADD CONSTRAINT "EntityLabelToEntity_entityLabelId_fkey" FOREIGN KEY ("entityLabelId") REFERENCES "EntityLabel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLabelToEntity" ADD CONSTRAINT "EntityLabelToEntity_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLabelToEntity" ADD CONSTRAINT "EntityLabelToEntity_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLabel" ADD CONSTRAINT "EventLabel_eventType_datasetId_fkey" FOREIGN KEY ("eventType", "datasetId") REFERENCES "EventType"("id", "datasetId") ON DELETE RESTRICT ON UPDATE CASCADE;

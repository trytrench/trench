/*
  Warnings:

  - A unique constraint covering the columns `[type,projectId]` on the table `EntityType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[type,projectId]` on the table `EventType` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[feature,projectId]` on the table `Feature` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `projectId` to the `EntityType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `EventType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Feature` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "EntityType" DROP CONSTRAINT "EntityType_datasetId_fkey";

-- DropForeignKey
ALTER TABLE "EventType" DROP CONSTRAINT "EventType_datasetId_fkey";

-- DropForeignKey
ALTER TABLE "Feature" DROP CONSTRAINT "Feature_datasetId_fkey";

-- AlterTable
ALTER TABLE "EntityType" ADD COLUMN     "projectId" TEXT NOT NULL,
ALTER COLUMN "datasetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "projectId" TEXT NOT NULL,
ALTER COLUMN "datasetId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Feature" ADD COLUMN     "projectId" TEXT NOT NULL,
ALTER COLUMN "datasetId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EntityType_type_projectId_key" ON "EntityType"("type", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "EventType_type_projectId_key" ON "EventType"("type", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_feature_projectId_key" ON "Feature"("feature", "projectId");

-- AddForeignKey
ALTER TABLE "EntityType" ADD CONSTRAINT "EntityType_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityType" ADD CONSTRAINT "EntityType_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

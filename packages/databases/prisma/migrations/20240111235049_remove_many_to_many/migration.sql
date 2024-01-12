/*
  Warnings:

  - You are about to drop the `FeatureToEntityType` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `entityTypeId` to the `Feature` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FeatureToEntityType" DROP CONSTRAINT "FeatureToEntityType_entityTypeId_fkey";

-- DropForeignKey
ALTER TABLE "FeatureToEntityType" DROP CONSTRAINT "FeatureToEntityType_featureId_fkey";

-- AlterTable
ALTER TABLE "Feature" ADD COLUMN     "entityTypeId" TEXT NOT NULL;

-- DropTable
DROP TABLE "FeatureToEntityType";

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "EntityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

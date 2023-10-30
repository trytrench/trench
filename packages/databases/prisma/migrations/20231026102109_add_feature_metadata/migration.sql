/*
  Warnings:

  - You are about to drop the column `releaseId` on the `FeatureMetadata` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[datasetId]` on the table `Backtest` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[feature]` on the table `FeatureMetadata` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `versionId` to the `FeatureMetadata` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FeatureMetadata" DROP CONSTRAINT "FeatureMetadata_releaseId_fkey";

-- AlterTable
ALTER TABLE "FeatureMetadata" DROP COLUMN "releaseId",
ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "versionId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Version" ADD COLUMN     "featureOrder" TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "Backtest_datasetId_key" ON "Backtest"("datasetId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureMetadata_feature_key" ON "FeatureMetadata"("feature");

-- AddForeignKey
ALTER TABLE "FeatureMetadata" ADD CONSTRAINT "FeatureMetadata_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "Version"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

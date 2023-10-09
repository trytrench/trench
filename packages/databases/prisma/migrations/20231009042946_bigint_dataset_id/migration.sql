/*
  Warnings:

  - The primary key for the `Dataset` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `Dataset` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `datasetId` on the `ProductionDataset` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ProductionDataset" DROP CONSTRAINT "ProductionDataset_datasetId_fkey";

-- AlterTable
ALTER TABLE "Dataset" DROP CONSTRAINT "Dataset_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" BIGSERIAL NOT NULL,
ADD CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "ProductionDataset" DROP COLUMN "datasetId",
ADD COLUMN     "datasetId" BIGINT NOT NULL;

-- AddForeignKey
ALTER TABLE "ProductionDataset" ADD CONSTRAINT "ProductionDataset_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

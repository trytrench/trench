-- DropForeignKey
ALTER TABLE "Feature" DROP CONSTRAINT "Feature_entityTypeId_fkey";

-- AlterTable
ALTER TABLE "Feature" ALTER COLUMN "entityTypeId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "EntityType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "EntityView" ADD COLUMN     "entityTypeId" TEXT;

-- AddForeignKey
ALTER TABLE "EntityView" ADD CONSTRAINT "EntityView_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "EntityType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

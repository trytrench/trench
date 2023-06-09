-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "locationId" TEXT;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

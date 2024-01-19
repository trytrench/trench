/*
  Warnings:

  - You are about to drop the column `eventTypes` on the `Node` table. All the data in the column will be lost.
  - Added the required column `eventType` to the `Node` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Node" DROP COLUMN "eventTypes",
ADD COLUMN     "eventType" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_eventType_fkey" FOREIGN KEY ("eventType") REFERENCES "EventType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

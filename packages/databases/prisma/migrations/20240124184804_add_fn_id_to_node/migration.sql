/*
  Warnings:

  - Added the required column `fnId` to the `Node` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "fnId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "Node" ADD CONSTRAINT "Node_fnId_fkey" FOREIGN KEY ("fnId") REFERENCES "Fn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

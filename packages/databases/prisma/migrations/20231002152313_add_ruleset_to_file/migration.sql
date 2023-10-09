/*
  Warnings:

  - You are about to drop the column `rulesetId` on the `FileSnapshot` table. All the data in the column will be lost.
  - Added the required column `rulesetId` to the `File` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "FileSnapshot" DROP CONSTRAINT "FileSnapshot_rulesetId_fkey";

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "rulesetId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "FileSnapshot" DROP COLUMN "rulesetId";

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("rulesetId") ON DELETE RESTRICT ON UPDATE CASCADE;

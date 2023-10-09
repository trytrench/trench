/*
  Warnings:

  - The primary key for the `Ruleset` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `rulesetId` on the `Ruleset` table. All the data in the column will be lost.
  - You are about to drop the `File` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FileSnapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BackfillJob" DROP CONSTRAINT "BackfillJob_rulesetId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_currentFileSnapshotId_fkey";

-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_rulesetId_fkey";

-- DropForeignKey
ALTER TABLE "FileSnapshot" DROP CONSTRAINT "FileSnapshot_fileId_fkey";

-- DropForeignKey
ALTER TABLE "ProductionRuleset" DROP CONSTRAINT "ProductionRuleset_rulesetId_fkey";

-- AlterTable
ALTER TABLE "Ruleset" DROP CONSTRAINT "Ruleset_pkey",
DROP COLUMN "rulesetId",
ADD COLUMN     "files" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "id" TEXT NOT NULL DEFAULT nanoid(),
ADD CONSTRAINT "Ruleset_pkey" PRIMARY KEY ("id");

-- DropTable
DROP TABLE "File";

-- DropTable
DROP TABLE "FileSnapshot";

-- AddForeignKey
ALTER TABLE "BackfillJob" ADD CONSTRAINT "BackfillJob_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionRuleset" ADD CONSTRAINT "ProductionRuleset_rulesetId_fkey" FOREIGN KEY ("rulesetId") REFERENCES "Ruleset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

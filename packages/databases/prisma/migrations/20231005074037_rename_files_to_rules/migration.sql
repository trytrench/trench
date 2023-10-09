/*
  Warnings:

  - You are about to drop the column `files` on the `Dataset` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Dataset" DROP COLUMN "files",
ADD COLUMN     "rules" JSONB NOT NULL DEFAULT '[]';

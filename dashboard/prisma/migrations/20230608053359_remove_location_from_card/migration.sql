/*
  Warnings:

  - You are about to drop the column `locationId` on the `Card` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Card" DROP CONSTRAINT "Card_locationId_fkey";

-- AlterTable
ALTER TABLE "Card" DROP COLUMN "locationId";

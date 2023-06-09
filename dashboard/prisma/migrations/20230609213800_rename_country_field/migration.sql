/*
  Warnings:

  - You are about to drop the column `countryCode` on the `Location` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Location" DROP COLUMN "countryCode",
ADD COLUMN     "countryISOCode" TEXT;

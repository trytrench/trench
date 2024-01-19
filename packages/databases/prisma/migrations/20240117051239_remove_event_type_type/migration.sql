/*
  Warnings:

  - You are about to drop the column `type` on the `EventType` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "EventType_type_key";

-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "type",
ALTER COLUMN "id" DROP DEFAULT;

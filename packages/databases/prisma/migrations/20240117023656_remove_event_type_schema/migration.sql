/*
  Warnings:

  - You are about to drop the column `exampleEvent` on the `EventType` table. All the data in the column will be lost.
  - You are about to drop the column `schema` on the `EventType` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EventType" DROP COLUMN "exampleEvent",
DROP COLUMN "schema";

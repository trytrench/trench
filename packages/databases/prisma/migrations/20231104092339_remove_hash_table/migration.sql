/*
  Warnings:

  - You are about to drop the `EventHandlerHash` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "EventHandler" DROP CONSTRAINT "EventHandler_hash_fkey";

-- DropTable
DROP TABLE "EventHandlerHash";

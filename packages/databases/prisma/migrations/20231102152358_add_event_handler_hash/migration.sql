/*
  Warnings:

  - You are about to drop the column `isDraft` on the `EventHandler` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `EventHandler` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[hash]` on the table `EventHandler` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `hash` to the `EventHandler` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventHandler" DROP COLUMN "isDraft",
DROP COLUMN "version",
ADD COLUMN     "hash" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "EventHandler_hash_key" ON "EventHandler"("hash");

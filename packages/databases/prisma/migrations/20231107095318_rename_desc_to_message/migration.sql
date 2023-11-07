/*
  Warnings:

  - You are about to drop the column `description` on the `EventHandler` table. All the data in the column will be lost.
  - Added the required column `message` to the `EventHandler` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EventHandler" DROP COLUMN "description",
ADD COLUMN     "message" TEXT NOT NULL;

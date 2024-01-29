/*
  Warnings:

  - You are about to drop the column `fnId` on the `Node` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Node" DROP CONSTRAINT "Node_fnId_fkey";

-- AlterTable
ALTER TABLE "Node" DROP COLUMN "fnId";

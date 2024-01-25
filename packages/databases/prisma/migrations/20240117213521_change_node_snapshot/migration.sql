/*
  Warnings:

  - You are about to drop the column `name` on the `NodeSnapshot` table. All the data in the column will be lost.
  - Added the required column `name` to the `Node` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Node" ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "NodeSnapshot" DROP COLUMN "name";

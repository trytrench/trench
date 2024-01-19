/*
  Warnings:

  - You are about to drop the column `returnSchema` on the `Node` table. All the data in the column will be lost.
  - Added the required column `returnSchema` to the `NodeSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Node" DROP COLUMN "returnSchema";

-- AlterTable
ALTER TABLE "NodeSnapshot" ADD COLUMN     "returnSchema" JSONB NOT NULL;

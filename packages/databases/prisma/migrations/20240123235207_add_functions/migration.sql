/*
  Warnings:

  - You are about to drop the column `type` on the `Node` table. All the data in the column will be lost.
  - You are about to drop the column `config` on the `NodeSnapshot` table. All the data in the column will be lost.
  - You are about to drop the column `returnSchema` on the `NodeSnapshot` table. All the data in the column will be lost.
  - Added the required column `valueSchema` to the `Node` table without a default value. This is not possible if the table is not empty.
  - Added the required column `functionId` to the `NodeSnapshot` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inputs` to the `NodeSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Node" DROP COLUMN "type",
ADD COLUMN     "valueSchema" JSONB NOT NULL;

-- AlterTable
ALTER TABLE "NodeSnapshot" DROP COLUMN "config",
DROP COLUMN "returnSchema",
ADD COLUMN     "functionId" TEXT NOT NULL,
ADD COLUMN     "inputs" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "Function" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "returnSchema" JSONB NOT NULL,

    CONSTRAINT "Function_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NodeSnapshot" ADD CONSTRAINT "NodeSnapshot_functionId_fkey" FOREIGN KEY ("functionId") REFERENCES "Function"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `functionId` on the `NodeSnapshot` table. All the data in the column will be lost.
  - You are about to drop the `Function` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `fnSnapshotId` to the `NodeSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "NodeSnapshot" DROP CONSTRAINT "NodeSnapshot_functionId_fkey";

-- AlterTable
ALTER TABLE "NodeSnapshot" DROP COLUMN "functionId",
ADD COLUMN     "fnSnapshotId" TEXT NOT NULL;

-- DropTable
DROP TABLE "Function";

-- CreateTable
CREATE TABLE "FnSnapshot" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fnId" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "returnSchema" JSONB NOT NULL,

    CONSTRAINT "FnSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fn" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,

    CONSTRAINT "Fn_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "NodeSnapshot" ADD CONSTRAINT "NodeSnapshot_fnSnapshotId_fkey" FOREIGN KEY ("fnSnapshotId") REFERENCES "FnSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FnSnapshot" ADD CONSTRAINT "FnSnapshot_fnId_fkey" FOREIGN KEY ("fnId") REFERENCES "Fn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/*
  Warnings:

  - You are about to drop the column `nodeId` on the `ExecutionEngineToNode` table. All the data in the column will be lost.
  - You are about to drop the column `config` on the `Node` table. All the data in the column will be lost.
  - You are about to drop the column `dependsOn` on the `Node` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Node` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nodeSnapshotId,executionEngineId]` on the table `ExecutionEngineToNode` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nodeSnapshotId` to the `ExecutionEngineToNode` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "ExecutionEngineToNode" DROP CONSTRAINT "ExecutionEngineToNode_nodeId_fkey";

-- DropIndex
DROP INDEX "ExecutionEngineToNode_nodeId_executionEngineId_key";

-- AlterTable
ALTER TABLE "ExecutionEngineToNode" DROP COLUMN "nodeId",
ADD COLUMN     "nodeSnapshotId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Node" DROP COLUMN "config",
DROP COLUMN "dependsOn",
DROP COLUMN "name";

-- CreateTable
CREATE TABLE "NodeSnapshot" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nodeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dependsOn" TEXT[],
    "config" JSONB NOT NULL,

    CONSTRAINT "NodeSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionEngineToNode_nodeSnapshotId_executionEngineId_key" ON "ExecutionEngineToNode"("nodeSnapshotId", "executionEngineId");

-- AddForeignKey
ALTER TABLE "NodeSnapshot" ADD CONSTRAINT "NodeSnapshot_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionEngineToNode" ADD CONSTRAINT "ExecutionEngineToNode_nodeSnapshotId_fkey" FOREIGN KEY ("nodeSnapshotId") REFERENCES "NodeSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

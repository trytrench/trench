/*
  Warnings:

  - You are about to drop the `ExecutionEngineToNode` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExecutionEngineToNode" DROP CONSTRAINT "ExecutionEngineToNode_executionEngineId_fkey";

-- DropForeignKey
ALTER TABLE "ExecutionEngineToNode" DROP CONSTRAINT "ExecutionEngineToNode_nodeSnapshotId_fkey";

-- DropTable
DROP TABLE "ExecutionEngineToNode";

-- CreateTable
CREATE TABLE "ExecutionEngineToNodeSnapshot" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nodeSnapshotId" TEXT NOT NULL,
    "executionEngineId" TEXT NOT NULL,

    CONSTRAINT "ExecutionEngineToNodeSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionEngineToNodeSnapshot_nodeSnapshotId_executionEngin_key" ON "ExecutionEngineToNodeSnapshot"("nodeSnapshotId", "executionEngineId");

-- AddForeignKey
ALTER TABLE "ExecutionEngineToNodeSnapshot" ADD CONSTRAINT "ExecutionEngineToNodeSnapshot_nodeSnapshotId_fkey" FOREIGN KEY ("nodeSnapshotId") REFERENCES "NodeSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionEngineToNodeSnapshot" ADD CONSTRAINT "ExecutionEngineToNodeSnapshot_executionEngineId_fkey" FOREIGN KEY ("executionEngineId") REFERENCES "ExecutionEngine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

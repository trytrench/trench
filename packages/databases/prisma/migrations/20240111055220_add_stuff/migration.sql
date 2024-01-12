/*
  Warnings:

  - You are about to drop the `ExecutionEngineToFeatureDefSnapshot` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeatureDef` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FeatureDefSnapshot` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "ExecutionEngineToFeatureDefSnapshot" DROP CONSTRAINT "ExecutionEngineToFeatureDefSnapshot_executionEngineId_fkey";

-- DropForeignKey
ALTER TABLE "ExecutionEngineToFeatureDefSnapshot" DROP CONSTRAINT "ExecutionEngineToFeatureDefSnapshot_featureDefSnapshotId_fkey";

-- DropForeignKey
ALTER TABLE "FeatureDefSnapshot" DROP CONSTRAINT "FeatureDefSnapshot_featureDefId_fkey";

-- DropTable
DROP TABLE "ExecutionEngineToFeatureDefSnapshot";

-- DropTable
DROP TABLE "FeatureDef";

-- DropTable
DROP TABLE "FeatureDefSnapshot";

-- CreateTable
CREATE TABLE "FeatureToEntityType" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "featureId" TEXT NOT NULL,
    "entityTypeId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "FeatureToEntityType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "schema" JSONB NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Node" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "returnSchema" JSONB NOT NULL,
    "eventTypes" TEXT[],
    "dependsOn" TEXT[],
    "config" JSONB NOT NULL,

    CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionEngineToNode" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nodeId" TEXT NOT NULL,
    "executionEngineId" TEXT NOT NULL,

    CONSTRAINT "ExecutionEngineToNode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FeatureToEntityType_featureId_entityTypeId_key" ON "FeatureToEntityType"("featureId", "entityTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionEngineToNode_nodeId_executionEngineId_key" ON "ExecutionEngineToNode"("nodeId", "executionEngineId");

-- AddForeignKey
ALTER TABLE "FeatureToEntityType" ADD CONSTRAINT "FeatureToEntityType_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatureToEntityType" ADD CONSTRAINT "FeatureToEntityType_entityTypeId_fkey" FOREIGN KEY ("entityTypeId") REFERENCES "EntityType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionEngineToNode" ADD CONSTRAINT "ExecutionEngineToNode_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "Node"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionEngineToNode" ADD CONSTRAINT "ExecutionEngineToNode_executionEngineId_fkey" FOREIGN KEY ("executionEngineId") REFERENCES "ExecutionEngine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

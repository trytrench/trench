-- CreateEnum
CREATE TYPE "GlobalStateKey" AS ENUM ('LastEventProcessedId', 'ActiveEngineId');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "options" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionEngineToFeatureDefSnapshot" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "featureDefSnapshotId" TEXT NOT NULL,
    "executionEngineId" TEXT NOT NULL,

    CONSTRAINT "ExecutionEngineToFeatureDefSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExecutionEngine" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExecutionEngine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GlobalState" (
    "key" "GlobalStateKey" NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "GlobalState_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "Event_timestamp_idx" ON "Event"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "ExecutionEngineToFeatureDefSnapshot_featureDefSnapshotId_ex_key" ON "ExecutionEngineToFeatureDefSnapshot"("featureDefSnapshotId", "executionEngineId");

-- AddForeignKey
ALTER TABLE "ExecutionEngineToFeatureDefSnapshot" ADD CONSTRAINT "ExecutionEngineToFeatureDefSnapshot_featureDefSnapshotId_fkey" FOREIGN KEY ("featureDefSnapshotId") REFERENCES "FeatureDefSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExecutionEngineToFeatureDefSnapshot" ADD CONSTRAINT "ExecutionEngineToFeatureDefSnapshot_executionEngineId_fkey" FOREIGN KEY ("executionEngineId") REFERENCES "ExecutionEngine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

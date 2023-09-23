-- AlterTable
ALTER TABLE "Entity" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EntityFeature" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EntityLabel" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EntityLabelType" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EntityType" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EventFeature" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EventLabel" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EventLabelType" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EventToEntityLink" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EventType" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "LinkType" ADD COLUMN     "datasetId" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Dataset" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawEvent" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "type" TEXT NOT NULL,

    CONSTRAINT "RawEvent_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "EventType" ADD CONSTRAINT "EventType_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventFeature" ADD CONSTRAINT "EventFeature_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityFeature" ADD CONSTRAINT "EntityFeature_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityType" ADD CONSTRAINT "EntityType_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entity" ADD CONSTRAINT "Entity_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkType" ADD CONSTRAINT "LinkType_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventToEntityLink" ADD CONSTRAINT "EventToEntityLink_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLabelType" ADD CONSTRAINT "EntityLabelType_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityLabel" ADD CONSTRAINT "EntityLabel_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLabelType" ADD CONSTRAINT "EventLabelType_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLabel" ADD CONSTRAINT "EventLabel_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

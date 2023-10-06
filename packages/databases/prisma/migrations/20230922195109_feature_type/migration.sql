-- AlterTable
ALTER TABLE "EntityFeature" ADD COLUMN     "dataType" TEXT NOT NULL DEFAULT 'string';

-- AlterTable
ALTER TABLE "EventFeature" ADD COLUMN     "dataType" TEXT NOT NULL DEFAULT 'string';

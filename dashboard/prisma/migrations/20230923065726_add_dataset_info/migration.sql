-- AlterTable
ALTER TABLE "Dataset" ADD COLUMN     "description" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "end" TIMESTAMP(3),
ADD COLUMN     "eventCount" INTEGER,
ADD COLUMN     "start" TIMESTAMP(3);

-- DropForeignKey
ALTER TABLE "BackfillJob" DROP CONSTRAINT "BackfillJob_lastEventId_fkey";

-- AlterTable
ALTER TABLE "BackfillJob" ALTER COLUMN "lastEventId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "BackfillJob" ADD CONSTRAINT "BackfillJob_lastEventId_fkey" FOREIGN KEY ("lastEventId") REFERENCES "EventLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

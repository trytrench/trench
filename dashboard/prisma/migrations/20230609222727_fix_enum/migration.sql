/*
  Warnings:

  - The values [Succeeded,Failed,Pending] on the enum `PaymentOutcomeStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `reason` on the `PaymentOutcome` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentOutcomeStatus_new" AS ENUM ('SUCCEEDED', 'FAILED', 'PENDING');
ALTER TABLE "PaymentOutcome" ALTER COLUMN "status" TYPE "PaymentOutcomeStatus_new" USING ("status"::text::"PaymentOutcomeStatus_new");
ALTER TYPE "PaymentOutcomeStatus" RENAME TO "PaymentOutcomeStatus_old";
ALTER TYPE "PaymentOutcomeStatus_new" RENAME TO "PaymentOutcomeStatus";
DROP TYPE "PaymentOutcomeStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "PaymentOutcome" DROP COLUMN "reason";

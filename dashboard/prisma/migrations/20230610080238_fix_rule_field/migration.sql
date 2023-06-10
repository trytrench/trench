/*
  Warnings:

  - The `rule` column on the `StripePaymentOutcome` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "StripePaymentOutcome" DROP COLUMN "rule",
ADD COLUMN     "rule" JSONB;

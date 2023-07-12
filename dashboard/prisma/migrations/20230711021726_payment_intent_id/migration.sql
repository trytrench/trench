/*
  Warnings:

  - A unique constraint covering the columns `[chargeId]` on the table `PaymentOutcome` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PaymentAttempt" ADD COLUMN     "paymentIntentId" TEXT;

-- AlterTable
ALTER TABLE "PaymentOutcome" ADD COLUMN     "chargeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOutcome_chargeId_key" ON "PaymentOutcome"("chargeId");

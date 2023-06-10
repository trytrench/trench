/*
  Warnings:

  - You are about to drop the column `stripeData` on the `PaymentOutcome` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "PaymentOutcome" DROP COLUMN "stripeData";

-- CreateTable
CREATE TABLE "StripePaymentOutcome" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "networkStatus" TEXT,
    "reason" TEXT,
    "riskLevel" TEXT,
    "riskScore" INTEGER,
    "rule" TEXT,
    "sellerMessage" TEXT,
    "type" TEXT,
    "paymentOutcomeId" TEXT NOT NULL,

    CONSTRAINT "StripePaymentOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripePaymentOutcome_paymentOutcomeId_key" ON "StripePaymentOutcome"("paymentOutcomeId");

-- AddForeignKey
ALTER TABLE "StripePaymentOutcome" ADD CONSTRAINT "StripePaymentOutcome_paymentOutcomeId_fkey" FOREIGN KEY ("paymentOutcomeId") REFERENCES "PaymentOutcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

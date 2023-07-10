/*
  Warnings:

  - A unique constraint covering the columns `[customId]` on the table `PaymentAttempt` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PaymentAttempt" ADD COLUMN     "customId" TEXT;

-- CreateTable
CREATE TABLE "StripePaymentReview" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "open" BOOLEAN NOT NULL,
    "reason" TEXT NOT NULL,
    "openedReason" TEXT NOT NULL,
    "closedReason" TEXT,
    "paymentAttemptId" TEXT NOT NULL,

    CONSTRAINT "StripePaymentReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripePaymentReview_paymentAttemptId_key" ON "StripePaymentReview"("paymentAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_customId_key" ON "PaymentAttempt"("customId");

-- AddForeignKey
ALTER TABLE "StripePaymentReview" ADD CONSTRAINT "StripePaymentReview_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

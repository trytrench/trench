/*
  Warnings:

  - A unique constraint covering the columns `[shippingAddressId]` on the table `PaymentAttempt` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "KycAttempt" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verificationReportId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "documentStatus" TEXT NOT NULL,
    "documentType" TEXT,
    "documentErrorReason" TEXT,
    "documentErrorCode" TEXT,
    "issuingCountry" TEXT,
    "dobDay" INTEGER,
    "dobMonth" INTEGER,
    "dobYear" INTEGER,
    "expiryDay" INTEGER,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "issuedDay" INTEGER,
    "issuedMonth" INTEGER,
    "issuedYear" INTEGER,
    "addressId" TEXT NOT NULL,
    "documentFiles" TEXT[],
    "selfieFile" TEXT,
    "selfieDocument" TEXT,
    "selfieStatus" TEXT,
    "selfieErrorReason" TEXT,
    "selfieErrorCode" TEXT,
    "evaluableActionId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "KycAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KycAttempt_addressId_key" ON "KycAttempt"("addressId");

-- CreateIndex
CREATE UNIQUE INDEX "KycAttempt_evaluableActionId_key" ON "KycAttempt"("evaluableActionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_shippingAddressId_key" ON "PaymentAttempt"("shippingAddressId");

-- AddForeignKey
ALTER TABLE "KycAttempt" ADD CONSTRAINT "KycAttempt_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycAttempt" ADD CONSTRAINT "KycAttempt_evaluableActionId_fkey" FOREIGN KEY ("evaluableActionId") REFERENCES "EvaluableAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

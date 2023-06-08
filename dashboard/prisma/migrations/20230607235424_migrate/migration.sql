-- CreateEnum
CREATE TYPE "PaymentOutcomeStatus" AS ENUM ('Succeeded', 'Failed', 'Pending');

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "customerId" TEXT,
    "checkoutSessionId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "billingAddressId" TEXT,
    "shippingAddressId" TEXT,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttemptAssessment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transformsOutput" JSONB NOT NULL DEFAULT '{}',
    "isFraud" BOOLEAN NOT NULL DEFAULT false,
    "riskLevel" TEXT NOT NULL,
    "paymentAttemptId" TEXT NOT NULL,

    CONSTRAINT "PaymentAttemptAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOutcome" (
    "id" TEXT NOT NULL,
    "customId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "PaymentOutcomeStatus" NOT NULL,
    "reason" TEXT NOT NULL,
    "stripeData" JSONB,
    "threeDSecureFlow" TEXT,
    "threeDSecureResult" TEXT,
    "threeDSecureResultReason" TEXT,
    "threeDSecureVersion" TEXT,
    "paymentAttemptId" TEXT NOT NULL,

    CONSTRAINT "PaymentOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "customId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phoneNumber" TEXT,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckoutSession" (
    "id" TEXT NOT NULL,
    "customId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "customerId" TEXT,
    "deviceSnapshotId" TEXT,

    CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "checkoutSessionId" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceSnapshot" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ipAddressId" TEXT NOT NULL,
    "fingerprint" TEXT,
    "userAgent" TEXT,
    "browserName" TEXT,
    "browserVersion" TEXT,
    "deviceModel" TEXT,
    "deviceType" TEXT,
    "deviceVendor" TEXT,
    "engineName" TEXT,
    "engineVersion" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "cpuArchitecture" TEXT,
    "isIncognito" BOOLEAN,
    "reqUserAgent" TEXT,
    "screenResolution" TEXT,
    "timezone" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "DeviceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "customId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT,
    "email" TEXT,
    "addressId" TEXT,
    "cvcCheck" TEXT,
    "addressLine1Check" TEXT,
    "postalCodeCheck" TEXT,
    "cardId" TEXT,
    "customerId" TEXT,
    "cardWallet" TEXT,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bin" TEXT,
    "brand" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "last4" TEXT NOT NULL,
    "funding" TEXT,
    "issuer" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "threeDSecureSupported" BOOLEAN,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "cityISOCode" TEXT,
    "cityName" TEXT,
    "countryCode" TEXT,
    "countryName" TEXT,
    "postalCode" TEXT,
    "regionISOCode" TEXT,
    "regionName" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpAddress" (
    "id" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "IpAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "line1" TEXT,
    "line2" TEXT,
    "postalCode" TEXT,
    "state" TEXT,
    "locationId" TEXT,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingAddress" (
    "id" TEXT NOT NULL,
    "customId" TEXT,
    "name" TEXT,
    "phoneNumber" TEXT,
    "addressId" TEXT NOT NULL,
    "customerId" TEXT,

    CONSTRAINT "ShippingAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingAddress" (
    "id" TEXT NOT NULL,
    "customId" TEXT,
    "name" TEXT,
    "phoneNumber" TEXT,
    "addressId" TEXT NOT NULL,
    "customerId" TEXT,

    CONSTRAINT "BillingAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tsCode" TEXT NOT NULL,
    "jsCode" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleExecution" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentAttemptId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "result" BOOLEAN,
    "error" TEXT,
    "riskLevel" TEXT NOT NULL,

    CONSTRAINT "RuleExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "regex" TEXT,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "List_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListItem" (
    "id" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttemptAssessment_paymentAttemptId_key" ON "PaymentAttemptAssessment"("paymentAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOutcome_customId_key" ON "PaymentOutcome"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOutcome_paymentAttemptId_key" ON "PaymentOutcome"("paymentAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customId_key" ON "Customer"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_customId_key" ON "CheckoutSession"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckoutSession_deviceSnapshotId_key" ON "CheckoutSession"("deviceSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_customId_key" ON "PaymentMethod"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "Card_fingerprint_key" ON "Card"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "IpAddress_ipAddress_key" ON "IpAddress"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "ShippingAddress_customId_key" ON "ShippingAddress"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingAddress_customId_key" ON "BillingAddress"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "List_alias_key" ON "List"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_value_key" ON "ListItem"("listId", "value");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_billingAddressId_fkey" FOREIGN KEY ("billingAddressId") REFERENCES "BillingAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "ShippingAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttemptAssessment" ADD CONSTRAINT "PaymentAttemptAssessment_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOutcome" ADD CONSTRAINT "PaymentOutcome_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckoutSession" ADD CONSTRAINT "CheckoutSession_deviceSnapshotId_fkey" FOREIGN KEY ("deviceSnapshotId") REFERENCES "DeviceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSnapshot" ADD CONSTRAINT "DeviceSnapshot_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSnapshot" ADD CONSTRAINT "DeviceSnapshot_ipAddressId_fkey" FOREIGN KEY ("ipAddressId") REFERENCES "IpAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpAddress" ADD CONSTRAINT "IpAddress_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingAddress" ADD CONSTRAINT "ShippingAddress_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingAddress" ADD CONSTRAINT "ShippingAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAddress" ADD CONSTRAINT "BillingAddress_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingAddress" ADD CONSTRAINT "BillingAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleExecution" ADD CONSTRAINT "RuleExecution_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleExecution" ADD CONSTRAINT "RuleExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

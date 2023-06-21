-- CreateEnum
CREATE TYPE "PaymentOutcomeStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'PENDING');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "customId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "phone" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionType" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "SessionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "customId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "typeId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EvaluableAction" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "transformsOutput" JSONB,
    "riskLevel" TEXT,
    "isFraud" BOOLEAN NOT NULL DEFAULT false,
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "EvaluableAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "sessionId" TEXT NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceSnapshot" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sessionId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "ipAddressId" TEXT,
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
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "cityGeonameId" INTEGER,
    "cityName" TEXT,
    "countryISOCode" TEXT,
    "countryName" TEXT,
    "postalCode" TEXT,
    "regionISOCode" TEXT,
    "regionName" TEXT,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IpAddress" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "ipAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locationId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "IpAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
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
CREATE TABLE "RuleSnapshot" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "tsCode" TEXT NOT NULL,
    "jsCode" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "ruleId" TEXT,

    CONSTRAINT "RuleSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentRuleSnapshotId" TEXT NOT NULL,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleToSessionType" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ruleId" TEXT NOT NULL,
    "sessionTypeId" TEXT NOT NULL,

    CONSTRAINT "RuleToSessionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleExecution" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluableActionId" TEXT NOT NULL,
    "ruleSnapshotId" TEXT NOT NULL,
    "result" BOOLEAN,
    "error" TEXT,
    "riskLevel" TEXT NOT NULL,

    CONSTRAINT "RuleExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "List" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
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
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "value" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "fingerprint" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bin" TEXT,
    "brand" TEXT NOT NULL,
    "country" TEXT,
    "last4" TEXT NOT NULL,
    "funding" TEXT,
    "issuer" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "threeDSecureSupported" BOOLEAN,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
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
    "cardWallet" TEXT,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "evaluableActionId" TEXT NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "shippingName" TEXT,
    "shippingPhone" TEXT,
    "shippingAddressId" TEXT,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentOutcome" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "customId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "PaymentOutcomeStatus" NOT NULL,
    "threeDSecureFlow" TEXT,
    "threeDSecureResult" TEXT,
    "threeDSecureResultReason" TEXT,
    "threeDSecureVersion" TEXT,
    "paymentAttemptId" TEXT NOT NULL,

    CONSTRAINT "PaymentOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripePaymentOutcome" (
    "id" TEXT NOT NULL DEFAULT nanoid(),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "networkStatus" TEXT,
    "reason" TEXT,
    "riskLevel" TEXT,
    "riskScore" INTEGER,
    "rule" JSONB,
    "sellerMessage" TEXT,
    "type" TEXT,
    "paymentOutcomeId" TEXT NOT NULL,

    CONSTRAINT "StripePaymentOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_customId_key" ON "User"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "SessionType_name_key" ON "SessionType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Session_customId_key" ON "Session"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceSnapshot_sessionId_key" ON "DeviceSnapshot"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "IpAddress_ipAddress_key" ON "IpAddress"("ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "Rule_currentRuleSnapshotId_key" ON "Rule"("currentRuleSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleToSessionType_ruleId_sessionTypeId_key" ON "RuleToSessionType"("ruleId", "sessionTypeId");

-- CreateIndex
CREATE UNIQUE INDEX "RuleExecution_evaluableActionId_ruleSnapshotId_key" ON "RuleExecution"("evaluableActionId", "ruleSnapshotId");

-- CreateIndex
CREATE UNIQUE INDEX "List_alias_key" ON "List"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "ListItem_listId_value_key" ON "ListItem"("listId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Card_fingerprint_key" ON "Card"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_customId_key" ON "PaymentMethod"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_evaluableActionId_key" ON "PaymentAttempt"("evaluableActionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOutcome_customId_key" ON "PaymentOutcome"("customId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentOutcome_paymentAttemptId_key" ON "PaymentOutcome"("paymentAttemptId");

-- CreateIndex
CREATE UNIQUE INDEX "StripePaymentOutcome_paymentOutcomeId_key" ON "StripePaymentOutcome"("paymentOutcomeId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "SessionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluableAction" ADD CONSTRAINT "EvaluableAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSnapshot" ADD CONSTRAINT "DeviceSnapshot_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSnapshot" ADD CONSTRAINT "DeviceSnapshot_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceSnapshot" ADD CONSTRAINT "DeviceSnapshot_ipAddressId_fkey" FOREIGN KEY ("ipAddressId") REFERENCES "IpAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IpAddress" ADD CONSTRAINT "IpAddress_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleSnapshot" ADD CONSTRAINT "RuleSnapshot_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_currentRuleSnapshotId_fkey" FOREIGN KEY ("currentRuleSnapshotId") REFERENCES "RuleSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleToSessionType" ADD CONSTRAINT "RuleToSessionType_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleToSessionType" ADD CONSTRAINT "RuleToSessionType_sessionTypeId_fkey" FOREIGN KEY ("sessionTypeId") REFERENCES "SessionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleExecution" ADD CONSTRAINT "RuleExecution_evaluableActionId_fkey" FOREIGN KEY ("evaluableActionId") REFERENCES "EvaluableAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleExecution" ADD CONSTRAINT "RuleExecution_ruleSnapshotId_fkey" FOREIGN KEY ("ruleSnapshotId") REFERENCES "RuleSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_evaluableActionId_fkey" FOREIGN KEY ("evaluableActionId") REFERENCES "EvaluableAction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_shippingAddressId_fkey" FOREIGN KEY ("shippingAddressId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentOutcome" ADD CONSTRAINT "PaymentOutcome_paymentAttemptId_fkey" FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StripePaymentOutcome" ADD CONSTRAINT "StripePaymentOutcome_paymentOutcomeId_fkey" FOREIGN KEY ("paymentOutcomeId") REFERENCES "PaymentOutcome"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE VIEW "CustomerToPaymentMethod" AS
SELECT
    "CheckoutSession"."customerId" AS "customerId",
    "PaymentMethod"."id" AS "paymentMethodId",
    MIN("PaymentAttempt"."createdAt") AS "firstSeenLink",
    MAX("PaymentAttempt"."createdAt") AS "lastSeenLink"
FROM
    "CheckoutSession"
    INNER JOIN "PaymentAttempt" ON "CheckoutSession"."id" = "PaymentAttempt"."checkoutSessionId"
    INNER JOIN "PaymentMethod" ON "PaymentAttempt"."paymentMethodId" = "PaymentMethod"."id"
GROUP BY
    "PaymentMethod"."id",
    "CheckoutSession"."customerId";


CREATE OR REPLACE VIEW "CustomerToPaymentAttempt" AS
SELECT
    "CheckoutSession"."customerId" AS "customerId",
    "PaymentAttempt"."id" AS "paymentAttemptId",
    MIN("PaymentAttempt"."createdAt") AS "firstSeenLink",
    MAX("PaymentAttempt"."createdAt") AS "lastSeenLink"
FROM
    "CheckoutSession"
    INNER JOIN "PaymentAttempt" ON "CheckoutSession"."id" = "PaymentAttempt"."checkoutSessionId"
GROUP BY
    "PaymentAttempt"."id",
    "CheckoutSession"."customerId";


CREATE OR REPLACE VIEW "CustomerToDevice" AS
SELECT
    "CheckoutSession"."customerId" AS "customerId",
    "DeviceSnapshot"."deviceId" AS "deviceId",
    MIN("DeviceSnapshot"."createdAt") AS "firstSeenLink",
    MAX("DeviceSnapshot"."createdAt") AS "lastSeenLink"
FROM
    "CheckoutSession"
    INNER JOIN "DeviceSnapshot" ON "CheckoutSession"."deviceSnapshotId" = "DeviceSnapshot"."id"
GROUP BY
    "CheckoutSession"."customerId",
    "DeviceSnapshot"."deviceId";

CREATE OR REPLACE VIEW "CustomerToCard" AS
SELECT
    "CheckoutSession"."customerId" AS "customerId",
    "PaymentMethod"."cardId" AS "cardId",
    MIN("PaymentAttempt"."createdAt") AS "firstSeenLink",
    MAX("PaymentAttempt"."createdAt") AS "lastSeenLink"
FROM
    "CheckoutSession"
    INNER JOIN "PaymentAttempt" ON "CheckoutSession"."id" = "PaymentAttempt"."checkoutSessionId"
    INNER JOIN "PaymentMethod" ON "PaymentAttempt"."paymentMethodId" = "PaymentMethod"."id"
GROUP BY
    "PaymentMethod"."cardId",
    "CheckoutSession"."customerId";

CREATE OR REPLACE VIEW "CustomerToIpAddress" AS
SELECT
    "CheckoutSession"."customerId" AS "customerId",
    "DeviceSnapshot"."ipAddressId" AS "ipAddressId",
    MIN("DeviceSnapshot"."createdAt") AS "firstSeenLink",
    MAX("DeviceSnapshot"."createdAt") AS "lastSeenLink"
FROM
    "CheckoutSession"
    INNER JOIN "DeviceSnapshot" ON "CheckoutSession"."deviceSnapshotId" = "DeviceSnapshot"."id"
GROUP BY
    "CheckoutSession"."customerId",
    "DeviceSnapshot"."ipAddressId";


CREATE OR REPLACE VIEW "PaymentAttemptToIpAddress" AS
SELECT
    "PaymentAttempt"."id" AS "PaymentAttemptId",
    "DeviceSnapshot"."ipAddressId" AS "ipAddressId"
FROM
    "PaymentAttempt"
    INNER JOIN "CheckoutSession" ON "CheckoutSession"."id" = "PaymentAttempt"."checkoutSessionId"
    INNER JOIN "DeviceSnapshot" ON "CheckoutSession"."deviceSnapshotId" = "DeviceSnapshot"."id";

    
CREATE OR REPLACE VIEW "DeviceToIpAddress" AS
SELECT
    "Device"."id" AS "deviceId",
    "DeviceSnapshot"."ipAddressId" AS "ipAddressId",
    MIN("DeviceSnapshot"."createdAt") AS "firstSeenLink",
    MAX("DeviceSnapshot"."createdAt") AS "lastSeenLink"
FROM
    "Device"
    INNER JOIN "DeviceSnapshot" ON "DeviceSnapshot"."deviceId" = "Device"."id"
GROUP BY
    "Device"."id",
    "DeviceSnapshot"."ipAddressId";

CREATE OR REPLACE VIEW "CardToIpAddress" AS
SELECT
    "Card"."id" AS "cardId",
    "DeviceSnapshot"."ipAddressId" AS "ipAddressId",
    MIN("PaymentAttempt"."createdAt") AS "firstSeenLink",
    MAX("PaymentAttempt"."createdAt") AS "lastSeenLink"
FROM
    "Card"
    INNER JOIN "PaymentMethod" ON "Card"."id" = "PaymentMethod"."cardId"
    INNER JOIN "PaymentAttempt" ON "PaymentAttempt"."paymentMethodId" = "PaymentMethod"."id"
    INNER JOIN "CheckoutSession" ON "CheckoutSession"."id" = "PaymentAttempt"."checkoutSessionId"
    INNER JOIN "DeviceSnapshot" ON "CheckoutSession"."deviceSnapshotId" = "DeviceSnapshot"."id"
GROUP BY
    "Card"."id",
    "DeviceSnapshot"."ipAddressId";

CREATE
OR REPLACE VIEW "CustomerPaymentMethodLink" AS
SELECT
    "CheckoutSession"."customerId" AS "customerId",
    "PaymentMethod"."id" AS "paymentMethodId",
    MIN("PaymentAttempt"."createdAt") AS "firstSeen",
    MAX("PaymentAttempt"."createdAt") AS "lastSeen"
FROM
    "CheckoutSession"
    INNER JOIN "PaymentAttempt" ON "CheckoutSession"."id" = "PaymentAttempt"."checkoutSessionId"
    INNER JOIN "PaymentMethod" ON "PaymentAttempt"."paymentMethodId" = "PaymentMethod"."id"
WHERE
    "CheckoutSession"."customerId" IS NOT NULL
GROUP BY
    "PaymentMethod"."id",
    "CheckoutSession"."customerId";

CREATE
OR REPLACE VIEW "CustomerPaymentAttemptLink" AS
SELECT
    "CheckoutSession"."customerId" AS "customerId",
    "PaymentAttempt"."id" AS "paymentAttemptId",
    MIN("PaymentAttempt"."createdAt") AS "firstSeen",
    MAX("PaymentAttempt"."createdAt") AS "lastSeen"
FROM
    "CheckoutSession"
    INNER JOIN "PaymentAttempt" ON "CheckoutSession"."id" = "PaymentAttempt"."checkoutSessionId"
WHERE
    "CheckoutSession"."customerId" IS NOT NULL
GROUP BY
    "PaymentAttempt"."id",
    "CheckoutSession"."customerId";

CREATE
OR REPLACE VIEW "CustomerDeviceLink" AS
SELECT
    "CheckoutSession"."customerId" AS "customerId",
    "DeviceSnapshot"."deviceId" AS "deviceId",
    MIN("DeviceSnapshot"."createdAt") AS "firstSeen",
    MAX("DeviceSnapshot"."createdAt") AS "lastSeen"
FROM
    "CheckoutSession"
    INNER JOIN "DeviceSnapshot" ON "CheckoutSession"."id" = "DeviceSnapshot"."checkoutSessionId"
WHERE
    "CheckoutSession"."customerId" IS NOT NULL
GROUP BY
    "CheckoutSession"."customerId",
    "DeviceSnapshot"."deviceId";

CREATE
OR REPLACE VIEW "CustomerCardLink" AS
SELECT
    "CheckoutSession"."customerId" AS "customerId",
    "PaymentMethod"."cardId" AS "cardId",
    MIN("PaymentAttempt"."createdAt") AS "firstSeen",
    MAX("PaymentAttempt"."createdAt") AS "lastSeen"
FROM
    "CheckoutSession"
    INNER JOIN "PaymentAttempt" ON "CheckoutSession"."id" = "PaymentAttempt"."checkoutSessionId"
    INNER JOIN "PaymentMethod" ON "PaymentAttempt"."paymentMethodId" = "PaymentMethod"."id"
WHERE
    "CheckoutSession"."customerId" IS NOT NULL
GROUP BY
    "PaymentMethod"."cardId",
    "CheckoutSession"."customerId";

CREATE
OR REPLACE VIEW "CustomerIpAddressLink" AS
SELECT
    "CheckoutSession"."customerId" AS "customerId",
    "DeviceSnapshot"."ipAddressId" AS "ipAddressId",
    MIN("DeviceSnapshot"."createdAt") AS "firstSeen",
    MAX("DeviceSnapshot"."createdAt") AS "lastSeen"
FROM
    "CheckoutSession"
    INNER JOIN "DeviceSnapshot" ON "CheckoutSession"."id" = "DeviceSnapshot"."checkoutSessionId"
WHERE
    "CheckoutSession"."customerId" IS NOT NULL
GROUP BY
    "CheckoutSession"."customerId",
    "DeviceSnapshot"."ipAddressId";

CREATE
OR REPLACE VIEW "PaymentAttemptIpAddressLink" AS
SELECT
    "PaymentAttempt"."id" AS "paymentAttemptId",
    "DeviceSnapshot"."ipAddressId" AS "ipAddressId"
FROM
    "PaymentAttempt"
    INNER JOIN "CheckoutSession" ON "CheckoutSession"."id" = "PaymentAttempt"."checkoutSessionId"
    INNER JOIN "DeviceSnapshot" ON "CheckoutSession"."id" = "DeviceSnapshot"."checkoutSessionId";

CREATE
OR REPLACE VIEW "DeviceIpAddressLink" AS
SELECT
    "Device"."id" AS "deviceId",
    "DeviceSnapshot"."ipAddressId" AS "ipAddressId",
    MIN("DeviceSnapshot"."createdAt") AS "firstSeen",
    MAX("DeviceSnapshot"."createdAt") AS "lastSeen"
FROM
    "Device"
    INNER JOIN "DeviceSnapshot" ON "DeviceSnapshot"."deviceId" = "Device"."id"
GROUP BY
    "Device"."id",
    "DeviceSnapshot"."ipAddressId";

CREATE
OR REPLACE VIEW "CardIpAddressLink" AS
SELECT
    "Card"."id" AS "cardId",
    "DeviceSnapshot"."ipAddressId" AS "ipAddressId",
    MIN("PaymentAttempt"."createdAt") AS "firstSeen",
    MAX("PaymentAttempt"."createdAt") AS "lastSeen"
FROM
    "Card"
    INNER JOIN "PaymentMethod" ON "Card"."id" = "PaymentMethod"."cardId"
    INNER JOIN "PaymentAttempt" ON "PaymentAttempt"."paymentMethodId" = "PaymentMethod"."id"
    INNER JOIN "CheckoutSession" ON "CheckoutSession"."id" = "PaymentAttempt"."checkoutSessionId"
    INNER JOIN "DeviceSnapshot" ON "CheckoutSession"."id" = "DeviceSnapshot"."checkoutSessionId"
GROUP BY
    "Card"."id",
    "DeviceSnapshot"."ipAddressId";
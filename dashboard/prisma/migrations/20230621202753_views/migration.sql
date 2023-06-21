CREATE
OR REPLACE VIEW "UserPaymentMethodLink" AS
SELECT
    "Session"."userId" AS "userId",
    "PaymentMethod"."id" AS "paymentMethodId",
    MIN("PaymentAttempt"."createdAt") AS "firstSeen",
    MAX("PaymentAttempt"."createdAt") AS "lastSeen"
FROM
    "Session"
    INNER JOIN "EvaluableAction" ON "Session"."id" = "EvaluableAction"."sessionId"
    INNER JOIN "PaymentAttempt" ON "EvaluableAction"."id" = "PaymentAttempt"."evaluableActionId"
    INNER JOIN "PaymentMethod" ON "PaymentAttempt"."paymentMethodId" = "PaymentMethod"."id"
WHERE
    "Session"."userId" IS NOT NULL
GROUP BY
    "PaymentMethod"."id",
    "Session"."userId";

CREATE
OR REPLACE VIEW "UserPaymentAttemptLink" AS
SELECT
    "Session"."userId" AS "userId",
    "PaymentAttempt"."id" AS "paymentAttemptId",
    MIN("EvaluableAction"."createdAt") AS "firstSeen",
    MAX("EvaluableAction"."createdAt") AS "lastSeen"
FROM
    "Session"
    INNER JOIN "EvaluableAction" ON "Session"."id" = "EvaluableAction"."sessionId"
    INNER JOIN "PaymentAttempt" ON "EvaluableAction"."id" = "PaymentAttempt"."evaluableActionId"
WHERE
    "Session"."userId" IS NOT NULL
GROUP BY
    "PaymentAttempt"."id",
    "Session"."userId";

CREATE
OR REPLACE VIEW "UserDeviceLink" AS
SELECT
    "Session"."userId" AS "userId",
    "DeviceSnapshot"."deviceId" AS "deviceId",
    MIN("DeviceSnapshot"."createdAt") AS "firstSeen",
    MAX("DeviceSnapshot"."createdAt") AS "lastSeen"
FROM
    "Session"
    INNER JOIN "DeviceSnapshot" ON "Session"."id" = "DeviceSnapshot"."sessionId"
WHERE
    "Session"."userId" IS NOT NULL
GROUP BY
    "Session"."userId",
    "DeviceSnapshot"."deviceId";

CREATE
OR REPLACE VIEW "UserCardLink" AS
SELECT
    "Session"."userId" AS "userId",
    "PaymentMethod"."cardId" AS "cardId",
    MIN("EvaluableAction"."createdAt") AS "firstSeen",
    MAX("EvaluableAction"."createdAt") AS "lastSeen"
FROM
    "Session"
    INNER JOIN "EvaluableAction" ON "Session"."id" = "EvaluableAction"."sessionId"
    INNER JOIN "PaymentAttempt" ON "EvaluableAction"."id" = "PaymentAttempt"."evaluableActionId"
    INNER JOIN "PaymentMethod" ON "PaymentAttempt"."paymentMethodId" = "PaymentMethod"."id"
WHERE
    "Session"."userId" IS NOT NULL
GROUP BY
    "PaymentMethod"."cardId",
    "Session"."userId";

CREATE
OR REPLACE VIEW "UserIpAddressLink" AS
SELECT
    "Session"."userId" AS "userId",
    "DeviceSnapshot"."ipAddressId" AS "ipAddressId",
    MIN("DeviceSnapshot"."createdAt") AS "firstSeen",
    MAX("DeviceSnapshot"."createdAt") AS "lastSeen"
FROM
    "Session"
    INNER JOIN "DeviceSnapshot" ON "Session"."id" = "DeviceSnapshot"."sessionId"
WHERE
    "Session"."userId" IS NOT NULL
GROUP BY
    "Session"."userId",
    "DeviceSnapshot"."ipAddressId";

CREATE
OR REPLACE VIEW "PaymentAttemptIpAddressLink" AS
SELECT
    "PaymentAttempt"."id" AS "paymentAttemptId",
    "DeviceSnapshot"."ipAddressId" AS "ipAddressId"
FROM
    "PaymentAttempt"
    INNER JOIN "EvaluableAction" ON "EvaluableAction"."id" = "PaymentAttempt"."evaluableActionId"
    INNER JOIN "Session" ON "Session"."id" = "EvaluableAction"."sessionId"
    INNER JOIN "DeviceSnapshot" ON "Session"."id" = "DeviceSnapshot"."sessionId";

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
    MIN("EvaluableAction"."createdAt") AS "firstSeen",
    MAX("EvaluableAction"."createdAt") AS "lastSeen"
FROM
    "Card"
    INNER JOIN "PaymentMethod" ON "Card"."id" = "PaymentMethod"."cardId"
    INNER JOIN "PaymentAttempt" ON "PaymentAttempt"."paymentMethodId" = "PaymentMethod"."id"
    INNER JOIN "EvaluableAction" ON "EvaluableAction"."id" = "PaymentAttempt"."evaluableActionId"
    INNER JOIN "Session" ON "Session"."id" = "EvaluableAction"."sessionId"
    INNER JOIN "DeviceSnapshot" ON "Session"."id" = "DeviceSnapshot"."sessionId"
GROUP BY
    "Card"."id",
    "DeviceSnapshot"."ipAddressId";


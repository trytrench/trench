CREATE MATERIALIZED VIEW "EntityTimeBucketsMatView" AS
SELECT
    date_trunc('hour', "Event"."timestamp") AS bucket,
    "Event"."type" AS "eventType",
    "EventToEntityLink"."type" AS "linkType",
    "Entity"."type" AS "entityType",
    COUNT(DISTINCT "entityId") AS "count"
FROM "EventToEntityLink"
JOIN "Event" ON "EventToEntityLink"."eventId" = "Event"."id"
JOIN "Entity" ON "EventToEntityLink"."entityId" = "Entity"."id"
GROUP BY
    date_trunc('hour', "Event"."timestamp"),
    "Event"."type",
    "EventToEntityLink"."type",
    "Entity"."type";

CREATE INDEX "EntityTimeBucketsMatView_bucket_idx" ON "EntityTimeBucketsMatView" ("bucket");

CREATE MATERIALIZED VIEW "EntityLabelsTimeBucketsMatView" AS
SELECT
    date_trunc('hour', "Event"."timestamp") AS bucket,
    "Event"."type" AS "eventType",
    "EventToEntityLink"."type" AS "linkType",
    "Entity"."type" AS "entityType",
    "_EntityToEntityLabel"."B" AS "entityLabel",
    COUNT(DISTINCT "entityId") AS "count"
FROM "EventToEntityLink"
JOIN "Event" ON "EventToEntityLink"."eventId" = "Event"."id"
JOIN "Entity" ON "EventToEntityLink"."entityId" = "Entity"."id"
LEFT JOIN "_EntityToEntityLabel" ON "_EntityToEntityLabel"."A" = "Entity"."id"
GROUP BY
    date_trunc('hour', "Event"."timestamp"),
    "Event"."type",
    "EventToEntityLink"."type",
    "Entity"."type",
    "entityLabel";

CREATE INDEX "EntityLabelsTimeBucketsMatView_bucket_idx" ON "EntityLabelsTimeBucketsMatView" ("bucket");

CREATE MATERIALIZED VIEW "EntityAppearancesMatView" AS
SELECT
    "Event"."id" as "eventId",
    "Event"."timestamp" as "timestamp",
    "Event"."type" as "eventType",
    "EventToEntityLink"."entityId" as "entityId",
    "EventToEntityLink"."type" as "linkType",
    "Entity"."type" as "entityType",
    "_EntityToEntityLabel"."B" as "entityLabel"
FROM "EventToEntityLink"
JOIN "Event" ON "Event"."id" = "EventToEntityLink"."eventId"
JOIN "Entity" ON "Entity"."id" = "EventToEntityLink"."entityId"
LEFT JOIN "_EntityToEntityLabel" ON "EventToEntityLink"."entityId" = "_EntityToEntityLabel"."A";

CREATE INDEX "EntityAppearancesMatView_timestamp_idx" ON "EntityAppearancesMatView" ("timestamp");
CREATE INDEX "EntityAppearancesMatView_eventId_idx" ON "EntityAppearancesMatView" ("eventId");
CREATE INDEX "EntityAppearancesMatView_entityId_idx" ON "EntityAppearancesMatView" ("entityId");
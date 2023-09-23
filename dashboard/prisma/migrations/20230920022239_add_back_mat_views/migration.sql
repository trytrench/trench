-- -- EventTimeBucketsMatView
-- CREATE MATERIALIZED VIEW "EventTimeBucketsMatView" AS
-- SELECT
--     date_trunc('hour', "Event"."timestamp") AS bucket,
--     "Event"."type" AS "eventType",
--     "EventToEntityLink"."type" AS "linkType",
--     "Entity"."type" AS "entityType",
--     "EventLabelToEvent"."eventLabelId" AS "eventLabel",
--     "Event"."datasetId" AS "dataset",
--     COUNT(DISTINCT ("Event"."id", "Event"."datasetId")) AS "count"
-- FROM "EventToEntityLink"
-- JOIN "Event" ON "EventToEntityLink"."eventId" = "Event"."id" AND "EventToEntityLink"."datasetId" = "Event"."datasetId"
-- JOIN "Entity" ON "EventToEntityLink"."entityId" = "Entity"."id" AND "EventToEntityLink"."datasetId" = "Entity"."datasetId"
-- LEFT JOIN "EventLabelToEvent" ON "EventLabelToEvent"."eventId" = "Event"."id" AND "EventLabelToEvent"."datasetId" = "Event"."datasetId"
-- GROUP BY
--     bucket, "eventType", "linkType", "entityType", "eventLabel", "dataset";

-- CREATE INDEX "EventTimeBucketsMatView_bucket_idx" ON "EventTimeBucketsMatView" ("bucket");

-- -- EntityTimeBucketsMatView
-- CREATE MATERIALIZED VIEW "EntityTimeBucketsMatView" AS
-- SELECT
--     date_trunc('hour', "Event"."timestamp") AS bucket,
--     "Event"."type" AS "eventType",
--     "EventToEntityLink"."type" AS "linkType",
--     "Entity"."type" AS "entityType",
--     "EventLabelToEvent"."eventLabelId" AS "eventLabel",
--     "EntityLabelToEntity"."entityLabelId" AS "entityLabel",
--     "Event"."datasetId" AS "dataset",
--     COUNT(DISTINCT ("Entity"."id", "Event"."datasetId")) AS "count"
-- FROM "EventToEntityLink"
-- JOIN "Event" ON "EventToEntityLink"."eventId" = "Event"."id" AND "EventToEntityLink"."datasetId" = "Event"."datasetId"
-- JOIN "Entity" ON "EventToEntityLink"."entityId" = "Entity"."id" AND "EventToEntityLink"."datasetId" = "Entity"."datasetId"
-- LEFT JOIN "EventLabelToEvent" ON "EventLabelToEvent"."eventId" = "Event"."id" AND "EventLabelToEvent"."datasetId" = "Event"."datasetId"
-- LEFT JOIN "EntityLabelToEntity" ON "EntityLabelToEntity"."entityId" = "Entity"."id" AND "EntityLabelToEntity"."datasetId" = "Entity"."datasetId"
-- GROUP BY
--     bucket, "eventType", "linkType", "entityType", "eventLabel", "entityLabel", "dataset";

-- CREATE INDEX "EntityTimeBucketsMatView_bucket_idx" ON "EntityTimeBucketsMatView" ("bucket");

-- -- EntityAppearancesMatView
-- CREATE MATERIALIZED VIEW "EntityAppearancesMatView" AS
-- SELECT
--     "Event"."id" as "eventId",
--     "Event"."timestamp" as "timestamp",
--     "Event"."type" as "eventType",
--     "EventToEntityLink"."entityId" as "entityId",
--     "EventToEntityLink"."type" as "linkType",
--     "Entity"."type" as "entityType",
--     "EntityLabelToEntity"."entityLabelId" as "entityLabel",
--     "Event"."datasetId" as "datasetId"
-- FROM "EventToEntityLink"
-- JOIN "Event" ON "Event"."id" = "EventToEntityLink"."eventId" AND "Event"."datasetId" = "EventToEntityLink"."datasetId"
-- JOIN "Entity" ON "Entity"."id" = "EventToEntityLink"."entityId" AND "Entity"."datasetId" = "EventToEntityLink"."datasetId"
-- LEFT JOIN "EntityLabelToEntity" ON "EventToEntityLink"."entityId" = "EntityLabelToEntity"."entityId" AND "EventToEntityLink"."datasetId" = "EntityLabelToEntity"."datasetId";

-- -- Creating indices for EntityAppearancesMatView
-- CREATE INDEX "EntityAppearancesMatView_timestamp_idx" ON "EntityAppearancesMatView" ("timestamp");
-- CREATE INDEX "EntityAppearancesMatView_eventId_idx" ON "EntityAppearancesMatView" ("eventId");
-- CREATE INDEX "EntityAppearancesMatView_entityId_idx" ON "EntityAppearancesMatView" ("entityId");



CREATE MATERIALIZED VIEW "EntityTimeBucketsMatView" AS
SELECT
    date_trunc('hour', "Event"."timestamp") AS bucket,
    "Event"."type" AS "eventType",
    "EventToEntityLink"."type" AS "linkType",
    "Entity"."type" AS "entityType",
    "EventToEntityLink"."datasetId" AS "datasetId",
    COUNT(DISTINCT "EventToEntityLink"."entityId") AS "count"
FROM "EventToEntityLink"
JOIN "Event" ON "EventToEntityLink"."eventId" = "Event"."id" AND "EventToEntityLink"."datasetId" = "Event"."datasetId"
JOIN "Entity" ON "EventToEntityLink"."entityId" = "Entity"."id" AND "EventToEntityLink"."datasetId" = "Entity"."datasetId"
GROUP BY
    date_trunc('hour', "Event"."timestamp"),
    "Event"."type",
    "EventToEntityLink"."type",
    "Entity"."type",
    "EventToEntityLink"."datasetId";

CREATE INDEX "EntityTimeBucketsMatView_bucket_idx" ON "EntityTimeBucketsMatView" ("bucket");

--

CREATE MATERIALIZED VIEW "EntityLabelsTimeBucketsMatView" AS
SELECT
    date_trunc('hour', "Event"."timestamp") AS bucket,
    "Event"."type" AS "eventType",
    "EventToEntityLink"."type" AS "linkType",
    "Entity"."type" AS "entityType",
    "EntityLabelToEntity"."entityLabelId" AS "entityLabel",
    "EventToEntityLink"."datasetId" AS "datasetId",
    COUNT(DISTINCT "EventToEntityLink"."entityId") AS "count"
FROM "EventToEntityLink"
JOIN "Event" ON "EventToEntityLink"."eventId" = "Event"."id" AND "EventToEntityLink"."datasetId" = "Event"."datasetId"
JOIN "Entity" ON "EventToEntityLink"."entityId" = "Entity"."id" AND "EventToEntityLink"."datasetId" = "Entity"."datasetId"
LEFT JOIN "EntityLabelToEntity" ON "EntityLabelToEntity"."entityId" = "Entity"."id" AND "EntityLabelToEntity"."datasetId" = "Entity"."datasetId"
GROUP BY
    date_trunc('hour', "Event"."timestamp"),
    "Event"."type",
    "EventToEntityLink"."type",
    "Entity"."type",
    "entityLabel",
    "EventToEntityLink"."datasetId";

CREATE INDEX "EntityLabelsTimeBucketsMatView_bucket_idx" ON "EntityLabelsTimeBucketsMatView" ("bucket");

--

CREATE MATERIALIZED VIEW "EntityAppearancesMatView" AS
SELECT
    "Event"."id" as "eventId",
    "Event"."timestamp" as "timestamp",
    "Event"."type" as "eventType",
    "EventToEntityLink"."entityId" as "entityId",
    "EventToEntityLink"."type" as "linkType",
    "Entity"."type" as "entityType",
    "EntityLabelToEntity"."entityLabelId" as "entityLabel",
    "EventToEntityLink"."datasetId" as "datasetId"
FROM "EventToEntityLink"
JOIN "Event" ON "Event"."id" = "EventToEntityLink"."eventId"
JOIN "Entity" ON "Entity"."id" = "EventToEntityLink"."entityId"
LEFT JOIN "EntityLabelToEntity"
    ON "EventToEntityLink"."entityId" = "EntityLabelToEntity"."entityId"
    AND "EventToEntityLink"."datasetId" = "EntityLabelToEntity"."datasetId";

CREATE INDEX "EntityAppearancesMatView_timestamp_idx" ON "EntityAppearancesMatView" ("timestamp");
CREATE INDEX "EntityAppearancesMatView_eventId_idx" ON "EntityAppearancesMatView" ("eventId");
CREATE INDEX "EntityAppearancesMatView_entityId_idx" ON "EntityAppearancesMatView" ("entityId");
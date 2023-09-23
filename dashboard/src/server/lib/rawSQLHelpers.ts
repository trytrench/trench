import { Prisma } from "@prisma/client";
import { EntityFilters, EventFilters } from "~/shared/validation";

export function AND_ENTITY_MATCHES_FILTERS(
  datasetId: number = 0,
  filters?: EntityFilters | null
) {
  if (!filters) return Prisma.empty;

  const labelChecks = filters.entityLabels?.map((labelId) => {
    return Prisma.sql`EXISTS (
      SELECT FROM "EntityLabelToEntity"
      WHERE "EntityLabelToEntity"."entityId" = "Entity"."id"
      AND "EntityLabelToEntity"."entityLabelId" = ${labelId}
      AND "EntityLabelToEntity"."datasetId" = ${datasetId}
    )`;
  });

  return Prisma.sql`${
    filters.entityType
      ? Prisma.sql`AND "Entity"."type" = ${filters.entityType}`
      : Prisma.empty
  } ${
    labelChecks?.length
      ? Prisma.join(labelChecks, " AND ", "AND ")
      : Prisma.empty
  }
  `;
}

export function AND_EVENT_MATCHES_FILTERS(
  datasetId: number = 0,
  filters?: EventFilters | null
) {
  if (!filters) return Prisma.empty;

  const labelChecks = filters.eventLabels?.map((labelId) => {
    return Prisma.sql`EXISTS (
      SELECT FROM "EventLabelToEvent"
      WHERE "EventLabelToEvent"."eventId" = "Event"."id"
      AND "EventLabelToEvent"."eventLabelId" = ${labelId}
      AND "EventLabelToEvent"."datasetId" = ${datasetId}
    )`;
  });

  return Prisma.sql`${
    filters.eventType
      ? Prisma.sql`AND "Event"."type" = ${filters.eventType}`
      : Prisma.empty
  } ${
    labelChecks?.length
      ? Prisma.join(labelChecks, " AND ", "AND ")
      : Prisma.empty
  }
  `;
}

export function AND_ENTITY_EXISTS_AT(
  datasetId: number = 0,
  entityIdColumn: string,
  filters?: EntityFilters | null
) {
  return Prisma.raw(`AND EXISTS (
    SELECT FROM "Entity"
    WHERE "Entity"."id" = ${entityIdColumn}
    ${AND_ENTITY_MATCHES_FILTERS(datasetId, filters)}
  )`);
}

export function AND_EVENT_EXISTS_AT(
  datasetId: number = 0,
  eventIdColumn: string,
  filters?: EventFilters | null
) {
  return Prisma.raw(`AND EXISTS (
    SELECT FROM "Event"
    WHERE "Event"."id" = ${eventIdColumn}
    ${AND_EVENT_MATCHES_FILTERS(datasetId, filters)}
  )`);
}

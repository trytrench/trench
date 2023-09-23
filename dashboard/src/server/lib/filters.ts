import { Prisma } from "@prisma/client";
import { type EntityFilters, type EventFilters } from "../../shared/validation";

export function getEntityExistsSubqueries(filters: EntityFilters) {
  return {
    entityType: filters?.entityType
      ? `"Entity"."type" = '${filters.entityType}'`
      : "",
    entityId: filters?.entityId ? `"Entity"."id" = '${filters.entityId}'` : "",
    entityLabels: filters?.entityLabels?.map((entityLabel) => {
      return `EXISTS (  
        SELECT FROM "EntityLabelToEntity"
        WHERE "EntityLabelToEntity"."entityId" = "Entity"."id"
        AND "EntityLabelToEntity"."entityLabelId" = '${entityLabel}'
      )`;
    }),
  };
}

export function buildEntityExistsQuery(
  filters: EntityFilters,
  entityIdComparison?: string
) {
  const { entityType, entityLabels, entityId } =
    getEntityExistsSubqueries(filters);

  if (!entityIdComparison) {
    return `1 = 1
      ${entityLabels?.length ? `AND (${entityLabels.join(" AND ")})` : ""}
      ${entityType ? `AND ${entityType}` : ""}
      ${entityId ? `AND ${entityId}` : ""}`;
  } else {
    return `EXISTS (
      SELECT from "Entity"
      WHERE "Entity"."id" = ${entityIdComparison}
      ${entityLabels?.length ? `AND (${entityLabels.join(" AND ")})` : ""}
      ${entityType ? `AND ${entityType}` : ""}
      ${entityId ? `AND ${entityId}` : ""}
    )`;
  }
}

export function getEventExistsSubqueries(filters: EventFilters) {
  return {
    eventLabels: filters?.eventLabels?.map((eventLabel) => {
      return `EXISTS (  
        SELECT FROM "EventLabelToEvent"
        WHERE "EventLabelToEvent"."eventId" = "Event"."id"
        AND "EventLabelToEvent"."eventLabelId" = '${eventLabel}'
      )`;
    }),
    eventType: filters?.eventType
      ? `"Event"."type" = '${filters.eventType}'`
      : "",
    dateRange: filters?.dateRange
      ? `"Event"."timestamp" >= to_timestamp(${
          filters.dateRange.from / 1000
        }) AND
        "Event"."timestamp" <= to_timestamp(${filters.dateRange.to / 1000})`
      : "",
  };
}

export function buildEventExistsQuery(
  filters: EventFilters,
  eventIdComparison?: string
) {
  const { eventLabels, eventType, dateRange } =
    getEventExistsSubqueries(filters);

  // const queryEventToEntityLink = filterByEntityId || filterByEntityLabel;

  if (!eventIdComparison) {
    const ret = `1 = 1
      ${eventLabels?.length ? `AND (${eventLabels.join(" AND ")})` : ""}
      ${eventType ? `AND ${eventType}` : ""}
      ${dateRange ? `AND ${dateRange}` : ""}`;
    return ret;
  } else {
    const ret = `EXISTS (
      SELECT from "Event"
      WHERE "Event"."id" = ${eventIdComparison}
      ${eventLabels?.length ? `AND (${eventLabels.join(" AND ")})` : ""}
      ${eventType ? `AND ${eventType}` : ""}
      ${dateRange ? `AND ${dateRange}` : ""}
    )`;
    return ret;
  }
}

export function getFiltersWhereQuery(
  filters: EventFilters
): Prisma.EventWhereInput {
  return {
    AND: [
      ...(filters?.dateRange
        ? [
            {
              timestamp: {
                gte: new Date(filters.dateRange.from),
                lte: new Date(filters.dateRange.to),
              },
            },
          ]
        : []),
      ...(filters?.eventLabels?.map((label) => ({
        eventLabels: {
          some: {
            id: {
              equals: label,
            },
          },
        },
      })) ?? []),
    ],
  };
}

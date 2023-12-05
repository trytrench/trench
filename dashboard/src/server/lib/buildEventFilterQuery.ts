import { getUnixTime } from "date-fns";
import { DataType } from "event-processing";
import { type z } from "zod";
import {
  type eventFiltersZod,
  type featureFiltersZod,
} from "../../shared/validation";

type EventFilterInput = z.infer<typeof eventFiltersZod>;

function checkAtMostOneIsDefined<T extends Record<string, any>>(
  obj: T
): asserts obj is { [K in keyof T]: NonNullable<T[K]> } {
  const definedKeys = Object.keys(obj).filter(
    (key) => obj[key as keyof T] !== undefined
  );
  if (definedKeys.length > 1) {
    throw new Error(
      `Exactly one of ${Object.keys(obj).join(", ")} must be defined`
    );
  }
}

const buildWhereClauseForFeatureFilter = (
  filter: z.infer<typeof featureFiltersZod>
) => {
  if (!filter) {
    return "";
  }

  const { featureId, dataType, value } = filter;
  const conditions = [];

  conditions.push(`feature_id = '${featureId}'`);
  switch (dataType) {
    case DataType.Float64:
    case DataType.Int64: {
      const column =
        dataType === DataType.Float64 ? "value_Float64" : "value_Int64";
      checkAtMostOneIsDefined(value);
      if (value.eq !== undefined) conditions.push(`${column} = ${value.eq}`);
      if (value.gt !== undefined) conditions.push(`${column} > ${value.gt}`);
      if (value.lt !== undefined) conditions.push(`${column} < ${value.lt}`);
      if (value.gte !== undefined) conditions.push(`${column} >= ${value.gte}`);
      if (value.lte !== undefined) conditions.push(`${column} <= ${value.lte}`);
      break;
    }
    case DataType.String: {
      const column = "value_String";
      checkAtMostOneIsDefined(value);
      if (value.eq !== undefined) conditions.push(`${column} = '${value.eq}'`);
      if (value.contains !== undefined)
        conditions.push(`${column} LIKE '%${value.contains}%'`);
      break;
    }
    case DataType.Boolean: {
      const column = "value_Bool";
      conditions.push(`${column} = ${value.eq}`);
      break;
    }
    case DataType.Entity: {
      const column = "value"; // String type, should be a JSON encoding of {type: string; id: string;}
      conditions.push(`${column}->>'type' = '${value.eq.entityType}'`);
      conditions.push(`${column}->>'id' = '${value.eq.entityId}'`);
      break;
    }
  }

  return conditions.length > 0 ? `(${conditions.join(" AND ")})` : "";
};

export const buildEventFilterQuery = (options: {
  filter: EventFilterInput;
  limit?: number;
  cursor?: number;
}): string => {
  const { filter, limit, cursor } = options;
  const whereClauses = [];

  if (!filter) {
    return "";
  }

  console.log("filter", filter);
  if (filter.dateRange) {
    if (filter.dateRange.from)
      whereClauses.push(
        `timestamp >= to_timestamp(${getUnixTime(
          new Date(filter.dateRange.from)
        )})`
      );
    if (filter.dateRange.to) {
      whereClauses.push(
        `timestamp <= to_timestamp(${getUnixTime(
          new Date(filter.dateRange.to)
        )})`
      );
    }
  }

  if (filter.eventType) {
    whereClauses.push(`event_type = '${filter.eventType}'`);
  }

  if (filter.entityIds && filter.entityIds.length > 0) {
    const entityConditions = filter.entityIds
      .map(
        (id) =>
          `arrayExists((type, id) -> type = 'Card' AND id = '${id}', arrayZip(entity_type, entity_id))`
      )
      .join(" OR ");
    whereClauses.push(`(${entityConditions})`);
  }

  if (filter.features && filter.features.length > 0) {
    const featureConditions = filter.features
      .map((feature) => buildWhereClauseForFeatureFilter(feature))
      .filter((condition) => condition !== "")
      .join(" OR ");
    if (featureConditions) {
      whereClauses.push(featureConditions);
    }
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  const finalQuery = `
    WITH entity_appearances AS (
        SELECT event_id, entity_type, entity_id
        FROM features
        WHERE notEmpty(entity_id)
        GROUP BY event_id, entity_type, entity_id
    ), 
    desired_event_ids AS (
        SELECT DISTINCT event_id
        FROM features
        JOIN events ON features.event_id = events.id
        ${whereClause}
    ), 
    event_features AS (
        SELECT
            event_id,
            groupArray(tuple(feature_id, value)) AS features_arr
        FROM features
        GROUP BY event_id
    )
    SELECT
        DISTINCT desired_event_ids.event_id as event_id,
        e.type as event_type,
        e.timestamp as event_timestamp,
        e.data as event_data,
        groupArray(tuple(ea.entity_type, ea.entity_id)) OVER (PARTITION BY e.id) AS entities,
        ef.features_arr as features_array
    FROM desired_event_ids
    LEFT JOIN entity_appearances ea ON desired_event_ids.event_id = ea.event_id
    LEFT JOIN events e ON desired_event_ids.event_id = e.id
    LEFT JOIN event_features ef ON desired_event_ids.event_id = ef.event_id
    ORDER BY event_id DESC
    LIMIT ${limit ?? 50} OFFSET ${cursor ?? 0};
  `;

  return finalQuery;
};

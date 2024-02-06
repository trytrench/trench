import { getUnixTime } from "date-fns";
import { type z } from "zod";
import {
  type DateRange,
  type EntityFilters,
  type eventFiltersZod,
  type featureFiltersZod,
} from "../../shared/validation";
import { db } from "databases";
import { TypeName } from "event-processing";

type EventFilterfilters = z.infer<typeof eventFiltersZod>;

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

const getWhereClausesForDateRange = (
  dateRange: DateRange,
  columnName: string
) => {
  const whereClauses = [];
  if (dateRange.from)
    whereClauses.push(
      `${columnName} >= ${getUnixTime(new Date(dateRange.from))}`
    );
  if (dateRange.to) {
    whereClauses.push(
      `${columnName} <= ${getUnixTime(new Date(dateRange.to))}`
    );
  }
  return whereClauses;
};

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
    case TypeName.Float64:
    case TypeName.Int64: {
      const column =
        dataType === TypeName.Float64 ? "value_Float64" : "value_Int64";
      checkAtMostOneIsDefined(value);
      if (value.eq !== undefined) conditions.push(`${column} = ${value.eq}`);
      if (value.gt !== undefined) conditions.push(`${column} > ${value.gt}`);
      if (value.lt !== undefined) conditions.push(`${column} < ${value.lt}`);
      if (value.gte !== undefined) conditions.push(`${column} >= ${value.gte}`);
      if (value.lte !== undefined) conditions.push(`${column} <= ${value.lte}`);
      break;
    }
    case TypeName.Name:
    case TypeName.String: {
      const column = "value_String";
      checkAtMostOneIsDefined(value);
      if (value.eq !== undefined) conditions.push(`${column} = '${value.eq}'`);
      if (value.contains !== undefined)
        conditions.push(`${column} LIKE '%${value.contains}%'`);
      break;
    }
    case TypeName.Boolean: {
      const column = "value_Bool";
      if (value.eq !== undefined) {
        conditions.push(`${column} = ${value.eq}`);
      }
      break;
    }
    case TypeName.Entity: {
      const column = "value"; // String type, should be a JSON encoding of {type: string; id: string;}
      if (value.eq !== undefined) {
        conditions.push(`${column}->>'type' = '${value.eq.entityType}'`);
        conditions.push(`${column}->>'id' = '${value.eq.entityId}'`);
      }
      break;
    }
  }

  return conditions.length > 0 ? `(${conditions.join(" AND ")})` : "";
};

export async function getEntitiesList(props: {
  filters: EntityFilters;
  limit?: number;
  cursor?: number;
}) {
  const { filters, limit, cursor } = props;

  const whereClauses = [];
  const havingClauses = [];
  const seenWhereClauses = [];

  havingClauses.push(`length(entity_id) = 1`);
  if (filters.entityType) {
    whereClauses.push(`entity_type = ['${filters.entityType}']`);
  }
  if (filters.entityId) {
    whereClauses.push(`entity_id = ['${filters.entityId}']`);
  }

  if (filters.features && filters.features.length > 0) {
    const featureConditions = filters.features
      .map((feature) => buildWhereClauseForFeatureFilter(feature))
      .filter((condition) => condition !== "")
      .join(" OR ");
    if (featureConditions) {
      whereClauses.push(featureConditions);
    }
  }

  if (filters.eventId) {
    whereClauses.push(`event_id = '${filters.eventId}'`);
  }

  if (filters.firstSeen) {
    seenWhereClauses.push(
      ...getWhereClausesForDateRange(filters.firstSeen, "first_seen")
    );
  }

  if (filters.lastSeen) {
    seenWhereClauses.push(
      ...getWhereClausesForDateRange(filters.lastSeen, "last_seen")
    );
  }

  const whereClause =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const havingClause =
    havingClauses.length > 0 ? `HAVING ${havingClauses.join(" AND ")}` : "";
  const seenWhereClause =
    seenWhereClauses.length > 0
      ? `WHERE ${seenWhereClauses.join(" AND ")}`
      : "";

  const finalWhereClause =
    whereClauses.length > 0
      ? `WHERE (entity_type, entity_id) IN (SELECT DISTINCT entity_type, entity_id FROM features ${whereClause})`
      : "";

  const finalQuery = `
    WITH timestamped_entities AS (
        SELECT
            entity_type,
            entity_id,
            min(event_timestamp) AS first_seen,
            max(event_timestamp) AS last_seen
        FROM features
        WHERE length(entity_id) = 1
        GROUP BY entity_type, entity_id
    )
    SELECT
        results.entity_type AS entity_type,
        results.entity_id AS entity_id,
        timestamped_entities.first_seen AS first_seen,
        timestamped_entities.last_seen AS last_seen,
        results.features_array AS features_array
    FROM (
        SELECT
            entity_type,
            entity_id,
            groupArray((latest_features.feature_id, latest_features.value, latest_features.error)) AS features_array
        FROM (
            SELECT
                entity_type,
                entity_id,
                feature_id,
                value,
                error,
                row_number() OVER (PARTITION BY entity_id, feature_id ORDER BY event_timestamp DESC) AS rn
            FROM features
            FINAL
            ${finalWhereClause}
        ) AS latest_features
        WHERE latest_features.rn = 1
        GROUP BY entity_type, entity_id
        ${havingClause}
    ) AS results
    JOIN timestamped_entities ON results.entity_type = timestamped_entities.entity_type AND results.entity_id = timestamped_entities.entity_id
    ${seenWhereClause}
    ORDER BY last_seen DESC
    LIMIT ${limit ?? 50} OFFSET ${cursor ?? 0};
  `;

  console.log(finalQuery);

  const result = await db.query({
    query: finalQuery,
    format: "JSONEachRow",
  });

  type EntityResult = {
    entity_type: [string];
    entity_id: [string];
    features_array: Array<[string, string | null, string | null]>;
    first_seen: string;
    last_seen: string;
  };

  const entities = await result.json<EntityResult[]>();

  return entities;
}

export const getEventsList = async (options: {
  filter: EventFilterfilters;
  limit?: number;
  cursor?: number;
}) => {
  const { filter, limit, cursor } = options;
  const whereClauses = [];

  if (filter) {
    if (filter.dateRange) {
      whereClauses.push(
        ...getWhereClausesForDateRange(filter.dateRange, "timestamp")
      );
    }

    if (filter.eventType) {
      whereClauses.push(`events.type = '${filter.eventType}'`);
    }

    if (filter.entities && filter.entities.length > 0) {
      const entityConditions = filter.entities
        .map(
          (ent) =>
            `arrayExists((type, id) -> type = '${ent.type}' AND id = '${ent.id}', arrayZip(entity_type, entity_id))`
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
        SELECT DISTINCT events.id as event_id
        FROM events
        FINAL
        LEFT JOIN features ON features.event_id = events.id
        ${whereClause}
        ORDER BY events.id DESC
        LIMIT ${limit ?? 50} OFFSET ${cursor ?? 0}
    ), 
    event_features AS (
        SELECT
            event_id,
            groupArray(tuple(feature_id, value, error)) AS features_arr
        FROM features
        FINAL
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
    ORDER BY desired_event_ids.event_id DESC;
  `;

  const result = await db.query({
    query: finalQuery,
    format: "JSONEachRow",
  });

  type EventResult = {
    event_id: string;
    event_type: string;
    event_timestamp: Date;
    event_data: string;
    entities: Array<[string[], string[]]>;
    features_array: Array<[string, string | null, string | null]>;
  };

  const events = await result.json<EventResult[]>();

  return events;
};

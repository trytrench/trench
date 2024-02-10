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

type EventFilters = z.infer<typeof eventFiltersZod>;

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
  conditions.push("error IS NULL");
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
  const seenHavingClauses = [];
  const seenWhereClauses = [];

  if (filters.entityType) {
    seenWhereClauses.push(`entity_type = '${filters.entityType}'`);
  }
  if (filters.entityId) {
    seenWhereClauses.push(`entity_id = '${filters.entityId}'`);
  }

  if (filters.seenWithEntityId) {
    whereClauses.push(
      `event_id IN (SELECT event_id FROM features WHERE entity_id = '${filters.seenWithEntityId}')`
    );
  }

  if (filters.seenInEventType) {
    whereClauses.push(
      `event_id IN (SELECT event_id FROM features WHERE event_type = '${filters.seenInEventType}')`
    );
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
    seenHavingClauses.push(
      ...getWhereClausesForDateRange(filters.firstSeen, "first_seen")
    );
  }
  if (filters.lastSeen) {
    seenHavingClauses.push(
      ...getWhereClausesForDateRange(filters.lastSeen, "last_seen")
    );
  }

  const whereClausesExist = whereClauses.length > 0;
  const seenHavingClause =
    seenHavingClauses.length > 0
      ? `HAVING ${seenHavingClauses.join(" AND ")}`
      : "";

  const featureIdList = filters.features?.map((feature) => feature.featureId);
  const featureIdWhereClause = featureIdList
    ? `feature_id IN (${featureIdList?.map((fId) => `'${fId}'`).join(",")})`
    : "";

  const finalQuery = `
    WITH timestamped_entities AS (
        SELECT
            entity_type,
            entity_id,
            min(event_timestamp) AS first_seen,
            max(event_timestamp) AS last_seen
        FROM features
        WHERE notEmpty(entity_id)
        ${
          seenWhereClauses.length > 0
            ? `AND ${seenWhereClauses.join(" AND ")}`
            : ""
        }
        GROUP BY entity_type, entity_id
        ${seenHavingClause}
    ),
    final_entity_results AS (
        SELECT 
            entity_type,
            entity_id,
            first_seen,
            last_seen
        FROM
            timestamped_entities
        ${
          whereClausesExist
            ? `
            JOIN (
                SELECT
                    *,
                    row_number() OVER (PARTITION BY entity_type, entity_id, feature_id ORDER BY event_id DESC) AS rn
                FROM features
                FINAL
                WHERE (entity_type, entity_id) IN (
                    SELECT entity_type, entity_id FROM timestamped_entities
                ) ${featureIdWhereClause ? `AND ${featureIdWhereClause}` : ""}
            ) as latest_features
            ON
                timestamped_entities.entity_type = latest_features.entity_type
                AND timestamped_entities.entity_id = latest_features.entity_id
                AND latest_features.rn = 1
            WHERE ${whereClauses.join(" AND ")}
            `
            : ""
        }
        GROUP BY
            entity_id, entity_type, first_seen, last_seen
        ORDER BY
            last_seen DESC
        LIMIT ${limit ?? 50} OFFSET ${cursor ?? 0}
    )
    SELECT
        final_entity_results.entity_id as entity_id,
        final_entity_results.entity_type as entity_type,
        first_seen,
        last_seen,
        groupArray(tuple(
          latest_features_2.feature_id,
          latest_features_2.value,
          latest_features_2.error
        )) as features_array
    FROM final_entity_results
    LEFT JOIN (
        SELECT
            entity_type,
            entity_id,
            feature_id,
            value,
            error,
            row_number() OVER (PARTITION BY entity_type, entity_id, feature_id ORDER BY event_id DESC) AS rn
        FROM features
        FINAL
        WHERE (entity_type, entity_id) IN (
            SELECT entity_type, entity_id FROM final_entity_results
        )
    ) as latest_features_2
        ON final_entity_results.entity_type = latest_features_2.entity_type
        AND final_entity_results.entity_id = latest_features_2.entity_id
        AND latest_features_2.rn = 1
    GROUP BY
        entity_id, entity_type, first_seen, last_seen
    ORDER BY
        last_seen DESC;
  `;

  const result = await db.query({
    query: finalQuery,
  });

  type EntityResult = {
    entity_type: string;
    entity_id: string;
    features_array: Array<[string, string | null, string | null]>;
    first_seen: string;
    last_seen: string;
  };

  const entities = await result.json<{
    data: EntityResult[];
    statistics: any;
  }>();

  // console.log(entities.data[0]?.features_array.map((f) => f[0]));

  console.log("=====");
  console.log(finalQuery);
  console.log(entities.statistics);

  return entities.data;
}

export const getEventsList = async (options: {
  filter: EventFilters;
  limit?: number;
  cursor?: number;
}) => {
  const { filter, limit, cursor } = options;
  const eventWhereClauses = [];
  const featureWhereClauses = [];
  const entityApperanceWhereClauses = [];

  if (filter) {
    if (filter.dateRange) {
      eventWhereClauses.push(
        ...getWhereClausesForDateRange(filter.dateRange, "timestamp")
      );
    }

    if (filter.eventType) {
      eventWhereClauses.push(`events.type = '${filter.eventType}'`);
    }

    entityApperanceWhereClauses.push("notEmpty(entity_id)");
    if (filter.entities && filter.entities.length > 0) {
      const entityConditions = filter.entities
        .map(
          (entity) =>
            `(entity_type = '${entity.type}' AND entity_id = '${entity.id}')`
        )
        .join(" OR ");
      entityApperanceWhereClauses.push(entityConditions);
    }

    if (filter.features && filter.features.length > 0) {
      const featureConditions = filter.features
        .map((feature) => buildWhereClauseForFeatureFilter(feature))
        .filter((condition) => condition !== "")
        .join(" OR ");
      if (featureConditions) {
        featureWhereClauses.push(featureConditions);
      }
    }
  }

  const whereClauses = [...eventWhereClauses, ...featureWhereClauses];
  const whereClausesExist = whereClauses.length > 0;
  const finalQuery = `
    WITH entity_appearances AS (
        SELECT event_id, entity_type, entity_id
        FROM features
        WHERE ${entityApperanceWhereClauses.join(" AND ")}
        GROUP BY event_id, entity_type, entity_id
    ),
    desired_event_ids AS (
        SELECT DISTINCT events.id as event_id
        FROM events
        FINAL
        ${
          featureWhereClauses.length > 0
            ? "LEFT JOIN features ON features.event_id = events.id"
            : ""
        }
        WHERE events.id IN (SELECT event_id FROM entity_appearances)
        ${whereClausesExist ? `AND ${whereClauses.join(" AND ")}` : ""}
        ORDER BY events.id DESC
        LIMIT ${limit ?? 50} OFFSET ${cursor ?? 0}
    ),
    event_features AS (
        SELECT
            event_id,
            groupArray(tuple(feature_id, value, error)) AS features_arr
        FROM features
        FINAL
        WHERE event_id IN (SELECT event_id FROM desired_event_ids)
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
  });

  type EventResult = {
    event_id: string;
    event_type: string;
    event_timestamp: Date;
    event_data: string;
    entities: Array<[string[], string[]]>;
    features_array: Array<[string, string | null, string | null]>;
  };

  const events = await result.json<{
    data: EventResult[];
    statistics: any;
  }>();

  return events.data;
};

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
import format from "date-fns/format";
import { uniq, uniqBy } from "lodash";
import {
  printEntityFilters,
  printEventFilters,
} from "../../shared/printFilters";

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
): {
  clauses: string;
  featureColumnsNeeded: Set<string>;
} => {
  if (!filter) {
    return {
      clauses: "",
      featureColumnsNeeded: new Set(),
    };
  }

  const { featureId, dataType, value } = filter;
  const conditions = [];
  const columnsNeeded = new Set<string>();

  conditions.push(`feature_id = '${featureId}'`);
  // conditions.push("error IS NULL");
  switch (dataType) {
    case TypeName.Float64:
    case TypeName.Int64: {
      const column =
        dataType === TypeName.Float64 ? "value_Float64" : "value_Int64";
      columnsNeeded.add(column);

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
      columnsNeeded.add(column);

      checkAtMostOneIsDefined(value);
      if (value.eq !== undefined) conditions.push(`${column} = '${value.eq}'`);
      if (value.contains !== undefined)
        conditions.push(`${column} LIKE '%${value.contains}%'`);
      break;
    }
    case TypeName.Boolean: {
      const column = "value_Bool";
      columnsNeeded.add(column);

      if (value.eq !== undefined) {
        conditions.push(`${column} = ${value.eq}`);
      }
      break;
    }
    case TypeName.Entity: {
      const column = "value"; // String type, should be a JSON encoding of {type: string; id: string;}
      columnsNeeded.add(column);

      if (value.eq !== undefined) {
        conditions.push(`${column}->>'type' = '${value.eq.entityType}'`);
        conditions.push(`${column}->>'id' = '${value.eq.entityId}'`);
      }
      break;
    }
  }

  return {
    clauses: conditions.length > 0 ? `(${conditions.join(" AND ")})` : "",
    featureColumnsNeeded: columnsNeeded,
  };
};

export async function getEntitiesList(props: {
  filters: EntityFilters;
  limit?: number;
  offset?: number;
}) {
  const { filters, limit, offset } = props;

  const featureWhereClauses = [];
  const seenWhereClauses = [];

  const allFeatureColumnsNeeded = new Set<string>();
  if (filters.features && filters.features.length > 0) {
    const featureConditions: string[] = [];
    for (const feature of filters.features) {
      const { clauses, featureColumnsNeeded } =
        buildWhereClauseForFeatureFilter(feature);
      if (clauses) {
        featureConditions.push(clauses);
      }

      for (const column of featureColumnsNeeded) {
        allFeatureColumnsNeeded.add(column);
      }
    }

    featureWhereClauses.push(
      featureConditions.filter((condition) => condition !== "").join(" OR ")
    );
  }

  if (filters.eventId) {
    featureWhereClauses.push(`event_id = '${filters.eventId}'`);
  }

  seenWhereClauses.push(`unique_entity_id != ''`);
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

  const featureWhereClausesExist = featureWhereClauses.length > 0;
  const seenWhereClause =
    seenWhereClauses.length > 0 ? `AND ${seenWhereClauses.join(" AND ")}` : "";

  const featureIdList = filters.features?.map((feature) => feature.featureId);
  const featureIdWhereClause = featureIdList
    ? `feature_id IN (${featureIdList?.map((fId) => `'${fId}'`).join(",")})`
    : "";

  const eventTypeWhereClause = filters.seenInEventType
    ? `event_type = '${filters.seenInEventType}'`
    : "";

  const seenWithEntity = filters.seenWithEntity;

  const finalQuery1 = `
    WITH timestamped_entities AS (
        SELECT
            unique_entity_id,
            first_seen,
            last_seen
        FROM entity_seen_view
        WHERE 1
        ${
          seenWithEntity
            ? `AND unique_entity_id IN (
                SELECT eav.unique_entity_id_2 AS unique_entity_id
                FROM entity_links_view AS eav
                WHERE eav.unique_entity_id_1 = '${seenWithEntity.type}_${seenWithEntity.id}'
            )`
            : ""
        }
        ${seenWhereClause}
        ${filters.entityId ? `AND entity_id = '${filters.entityId}'` : ""}
        ${filters.entityType ? `AND entity_type = '${filters.entityType}'` : ""}
    )
        SELECT
            unique_entity_id,
            first_seen,
            last_seen
        FROM
            timestamped_entities
        ${
          featureWhereClausesExist
            ? `
            LEFT SEMI JOIN (
                SELECT DISTINCT unique_entity_id
                FROM latest_entity_features_view AS features
                WHERE 1
                ${featureIdWhereClause ? `AND ${featureIdWhereClause}` : ""}
                ${eventTypeWhereClause ? `AND ${eventTypeWhereClause}` : ""}
                ${
                  filters.entityType
                    ? `AND entity_type = '${filters.entityType}'`
                    : ""
                }
                ${
                  featureWhereClausesExist
                    ? `AND ${featureWhereClauses.join(" AND ")}`
                    : ""
                }
            ) AS features
            ON timestamped_entities.unique_entity_id = features.unique_entity_id
            `
            : ""
        }
        ORDER BY
            last_seen DESC
        LIMIT ${limit ?? 50} OFFSET ${offset ?? 0}
  `;

  const result = await db.query({
    query: finalQuery1,
  });

  type EntityResult = {
    unique_entity_id: string;
    first_seen: string;
    last_seen: string;
  };

  const entities = await result.json<{
    data: EntityResult[];
    statistics: any;
  }>();

  console.log(entities.data);

  if (entities.data.length === 0) {
    console.log("Early return");
    return [];
  }

  const finalQuery2 = `
    SELECT
        unique_entity_id,
        entity_type,
        entity_id,
        groupArray((feature_id, value)) as features_array
    FROM latest_entity_features_view
    WHERE unique_entity_id IN (${entities.data
      .map((entity) => `'${entity.unique_entity_id}'`)
      .join(", ")})
    GROUP BY unique_entity_id, entity_type, entity_id
    SETTINGS optimize_move_to_prewhere_if_final = 1
  `;

  const result2 = await db.query({
    query: finalQuery2,
  });
  const entities2 = await result2.json<{
    data: {
      unique_entity_id: string;
      entity_type: string;
      entity_id: string;
      features_array: Array<[string, string | null]>;
    }[];
    statistics: any;
  }>();

  console.log();
  console.log("````````````````````");
  console.log("Time:", format(new Date(), "h:mm:ss a"));
  console.log();

  // console.log(Object.keys(entities));
  // console.log(finalQuery1);
  console.log("getEntitiesList - desired_entities");
  printEntityFilters(filters);
  console.log(entities.statistics);
  console.log();
  // console.log(Object.keys(entities2));
  // console.log(finalQuery2);
  console.log("getEntitiesList - features");
  console.log(entities2.statistics);
  console.log("....................");
  console.log();

  // merge the two results
  const entityMap = new Map(
    entities2.data.map((entity) => [entity.unique_entity_id, entity])
  );

  const mergedEntities: {
    entity_id: string;
    entity_type: string;
    first_seen: string;
    last_seen: string;
    features_array: Array<[string, string | null, null]>;
  }[] = entities.data.map((entity) => {
    const key = entity.unique_entity_id;
    const entityData = entityMap.get(key);
    const features = entityData?.features_array ?? [];
    return {
      ...entity,
      entity_id: entityData?.entity_id ?? "",
      entity_type: entityData?.entity_type ?? "",
      features_array: features.map((arr) => [...arr, null]), // Error is null
    };
  });

  return mergedEntities;
}

export const getEventsList = async (options: {
  filter: EventFilters;
  limit?: number;
  offset?: number;
}) => {
  const { filter, limit, offset } = options;

  // Query 1: Identifying relevant event IDs
  const eventWhereClauses = [];
  const featureWhereClauses = [];
  const entityApperanceWhereClauses = [];

  if (filter.dateRange) {
    eventWhereClauses.push(
      ...getWhereClausesForDateRange(filter.dateRange, "timestamp")
    );
  }

  if (filter.eventType) {
    eventWhereClauses.push(`type = '${filter.eventType}'`);
  }

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
      .map((feature) => {
        const { clauses } = buildWhereClauseForFeatureFilter(feature);
        return clauses;
      })
      .filter((clause) => clause !== "");
    featureWhereClauses.push(featureConditions.join(" OR "));
  }

  const whereClauses = [...eventWhereClauses, ...featureWhereClauses];
  const whereClausesExist = whereClauses.length > 0;

  const eventIDsQuery = `
    SELECT DISTINCT events.id as event_id
    FROM events
    ${
      featureWhereClauses.length > 0
        ? "LEFT JOIN features ON features.event_id = events.id"
        : ""
    }
    WHERE 1
    ${
      entityApperanceWhereClauses.length > 0
        ? `AND events.id IN (
            SELECT event_id FROM features
            WHERE feature_type = 'EntityAppearance'
            AND ${entityApperanceWhereClauses.join(" AND ")}
            GROUP BY event_id
          )`
        : ""
    }
    ${whereClausesExist ? `AND ${whereClauses.join(" AND ")}` : ""}
    ORDER BY events.id DESC
    LIMIT ${limit ?? 50} OFFSET ${offset ?? 0}
  `;
  const eventIDsResultRaw = await db.query({ query: eventIDsQuery });

  const eventIDsResult = await eventIDsResultRaw.json<{
    data: Array<{ event_id: string }>;
    statistics: any;
  }>();

  if (eventIDsResult.data.length === 0) {
    return [];
  }

  const eventIDs = eventIDsResult.data.map((event) => event.event_id);

  if (eventIDs.length === 0) {
    return [];
  }
  // Query 2: Fetching event details for the identified event IDs
  const eventsDetailsQuery = `
    WITH features_subset AS (
        SELECT 
            event_id,
            feature_id,
            value,
            error,
            feature_type,
            entity_type,
            entity_id
        FROM features
        FINAL
        WHERE event_id IN (${eventIDs.map((id) => `'${id}'`).join(", ")})
    ),
    event_features AS (
        SELECT
            event_id,
            groupArray(tuple(feature_id, value, error)) AS features_arr
        FROM features_subset
        WHERE event_id IN (${eventIDs.map((id) => `'${id}'`).join(", ")})
        GROUP BY event_id
    ),
    entity_appearances AS (
        SELECT
            event_id,
            groupArray(tuple(entity_type, entity_id)) AS entities
        FROM features_subset
        WHERE feature_type = 'EntityAppearance'
        AND event_id IN (${eventIDs.map((id) => `'${id}'`).join(", ")})
        GROUP BY event_id
    )
    SELECT
        e.id as event_id,
        any(e.type) as event_type,
        any(e.timestamp) as event_timestamp,
        any(e.data) as event_data,
        any(entities) as entities,
        any(features_arr) as features
    FROM events e
    LEFT JOIN event_features ef ON e.id = ef.event_id
    LEFT JOIN entity_appearances ea ON e.id = ea.event_id
    WHERE e.id IN (${eventIDs.map((id) => `'${id}'`).join(", ")})
    GROUP BY e.id
    ORDER BY e.id DESC
  `;

  const eventsDetailsResultRaw = await db.query({ query: eventsDetailsQuery });

  const eventsDetailsResult = await eventsDetailsResultRaw.json<{
    data: Array<{
      event_id: string;
      event_type: string;
      event_timestamp: Date;
      event_data: string;
      entities: Array<[string, string]>;
      features: Array<[string, string | null, string | null]>;
    }>;
    statistics: any;
  }>();

  // console.log(JSON.stringify(eventsDetailsResult.data[0], null, 2));

  console.log();
  console.log("````````````````````");
  console.log("getEventsList");
  printEventFilters(filter);
  console.log(eventIDsResult.statistics);
  console.log(eventsDetailsResult.statistics);
  console.log("....................");
  console.log();

  return eventsDetailsResult.data;
};

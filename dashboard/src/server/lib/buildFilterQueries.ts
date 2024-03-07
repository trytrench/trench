import { getUnixTime } from "date-fns";
import { type z } from "zod";
import {
  FeatureFilter,
  type DateRange,
  type EntityFilter,
  type EventFilter,
  type eventFilterZod,
  type featureFilterDataZod,
  EventFilterType,
  EntityFilterType,
  getEntityFiltersOfType,
} from "../../shared/validation";
import { db } from "databases";
import { TypeName } from "event-processing";
import format from "date-fns/format";
import { uniq, uniqBy } from "lodash";
import {
  printEntityFilters,
  printEventFilters,
} from "../../shared/printFilters";

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
  filter: FeatureFilter
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
  filters: EntityFilter[];
  limit?: number;
  offset?: number;
}) {
  const { filters, limit, offset } = props;

  const seenWhereClauses = [];

  const allFeatureColumnsNeeded = new Set<string>();
  const featureConditions: string[] = [];

  const entityType =
    getEntityFiltersOfType(filters, EntityFilterType.EntityType)[0]?.data ?? "";

  for (const filter of filters) {
    switch (filter.type) {
      case EntityFilterType.EntityType: {
        seenWhereClauses.push(`entity_type = '${filter.data}'`);
        break;
      }
      case EntityFilterType.EntityId: {
        seenWhereClauses.push(`entity_id = '${filter.data}'`);
        break;
      }
      case EntityFilterType.FirstSeen: {
        seenWhereClauses.push(
          ...getWhereClausesForDateRange(filter.data, "first_seen")
        );
        break;
      }
      case EntityFilterType.LastSeen: {
        seenWhereClauses.push(
          ...getWhereClausesForDateRange(filter.data, "last_seen")
        );
        break;
      }

      case EntityFilterType.Feature: {
        const { clauses, featureColumnsNeeded } =
          buildWhereClauseForFeatureFilter(filter.data);
        if (clauses) {
          featureConditions.push(clauses);
        }

        for (const column of featureColumnsNeeded) {
          allFeatureColumnsNeeded.add(column);
        }
        break;
      }
      case EntityFilterType.SeenWithEntity: {
        const { type, id } = filter.data;
        seenWhereClauses.push(
          `unique_entity_id IN (
              SELECT eav.unique_entity_id_2 AS unique_entity_id
              FROM entity_links_view AS eav
              WHERE eav.unique_entity_id_1 = '${type}_${id}'
          )`
        );
        break;
      }

      case EntityFilterType.SeenInEventId: {
        // TODO: Implement properly
        // featureConditions.push(`event_id = '${filter.data}'`);
        break;
      }
    }
  }
  /// Seen in event type
  const seenInEventTypeFilter = getEntityFiltersOfType(
    filters,
    EntityFilterType.SeenInEventType
  )[0]?.data;
  seenWhereClauses.push(`event_type = '${seenInEventTypeFilter ?? ""}'`);

  seenWhereClauses.push("entity_type != ''");

  const seenWhereClause =
    seenWhereClauses.length > 0 ? `${seenWhereClauses.join(" AND ")}` : "1";

  const finalQuery1 = `
    WITH timestamped_entities AS (
        SELECT
            unique_entity_id, first_seen, last_seen
        FROM entities_seen_mv_table
        FINAL
        WHERE ${seenWhereClause}
    )
    SELECT
        timestamped_entities.unique_entity_id AS unique_entity_id,
        first_seen,
        last_seen,
        count() OVER() AS total_count
    FROM
        timestamped_entities
    ${featureConditions
      .map((clause, idx) => {
        const alias = `f_${idx}`;
        return `
              LEFT SEMI JOIN (
                  SELECT unique_entity_id
                  FROM latest_entity_features_view AS features
                  WHERE 
                  entity_type = '${entityType}'
                  AND ${clause}
              ) AS ${alias}
              ON timestamped_entities.unique_entity_id = ${alias}.unique_entity_id
            `;
      })
      .join("\n")}
    ORDER BY
        last_seen DESC
    LIMIT ${limit ?? 50} OFFSET ${offset ?? 0}
    SETTINGS 
      convert_query_to_cnf = true,
      join_algorithm = 'parallel_hash',
      optimize_trivial_count_query = 1;
  `;

  const result = await db.query({
    query: finalQuery1,
  });

  type EntityResult = {
    unique_entity_id: string;
    first_seen: string;
    last_seen: string;
    total_count: string | null;
  };

  const entities = await result.json<{
    data: EntityResult[];
    statistics: any;
  }>();

  const totalCount = entities.data[0]?.total_count
    ? parseInt(entities.data[0].total_count)
    : 0;

  console.log(entities.data[0]);

  if (entities.data.length === 0) {
    console.log("Early return");
    return {
      count: 0,
      rows: [],
    };
  }

  const finalQuery2 = `
    SELECT
        unique_entity_id,
        any(entity_type) as entity_type,
        any(entity_id) as entity_id,
        groupArray((feature_id, value)) as features_array
    FROM latest_entity_features_view
    WHERE unique_entity_id IN (${entities.data
      .map((entity) => `'${entity.unique_entity_id}'`)
      .join(", ")})
    GROUP BY unique_entity_id
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
  console.log(finalQuery1);
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

  return {
    count: totalCount,
    rows: mergedEntities,
  };
}

export const getEventsList = async (options: {
  filters: EventFilter[];
  limit?: number;
  offset?: number;
}) => {
  const { filters, limit, offset } = options;

  // Query 1: Identifying relevant event IDs
  const eventWhereClauses = [];
  const featureWhereClauses = [];
  const entityApperanceWhereClauses = [];

  for (const filter of filters) {
    switch (filter.type) {
      case EventFilterType.DateRange: {
        eventWhereClauses.push(
          ...getWhereClausesForDateRange(filter.data, "timestamp")
        );
        break;
      }
      case EventFilterType.EventType: {
        eventWhereClauses.push(`type = '${filter.data}'`);
        break;
      }
      case EventFilterType.Feature: {
        const { clauses } = buildWhereClauseForFeatureFilter(filter.data);
        featureWhereClauses.push(clauses);
        break;
      }
      case EventFilterType.Entities: {
        const entityConditions = filter.data
          .map(
            (entity) =>
              `(entity_type = '${entity.type}' AND entity_id = '${entity.id}')`
          )
          .join(" OR ");
        entityApperanceWhereClauses.push(entityConditions);
        break;
      }
    }
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
  printEventFilters(filters);
  console.log(eventIDsResult.statistics);
  console.log(eventsDetailsResult.statistics);
  console.log("....................");
  console.log();

  return eventsDetailsResult.data;
};

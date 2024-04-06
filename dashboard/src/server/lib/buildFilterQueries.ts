import { getUnixTime } from "date-fns";
import { type z } from "zod";
import {
  type FeatureFilter,
  type DateRange,
  type EntityFilter,
  type EventFilter,
  EventFilterType,
  EntityFilterType,
  getEntityFiltersOfType,
} from "../../shared/validation";
import { db } from "databases";
import { TypeName } from "event-processing";
import format from "date-fns/format";
import {
  printEntityFilters,
  printEventFilters,
} from "../../shared/printFilters";

export function checkAtMostOneIsDefined<T extends Record<string, any>>(
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

export const getWhereClausesForDateRange = (
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

export const buildWhereClauseForFeatureFilter = (
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

export function getEntityQueryInfo(filters: EntityFilter[]) {
  const seenWhereClauses = [];

  const allFeatureColumnsNeeded = new Set<string>();
  const featureConditions: string[] = [];

  const eventIdConditions: string[] = [];

  const entityType =
    getEntityFiltersOfType(filters, EntityFilterType.EntityType)[0]?.data ?? "";

  const seenFilter = getEntityFiltersOfType(filters, EntityFilterType.Seen)[0]
    ?.data;

  const entityIdFilter = getEntityFiltersOfType(
    filters,
    EntityFilterType.EntityId
  )[0]?.data;

  const seenWithFilter = getEntityFiltersOfType(
    filters,
    EntityFilterType.SeenWithEntity
  )[0]?.data;

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
        eventIdConditions.push(`event_id = '${filter.data}'`);
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

  return {
    seenFilter,
    seenWithFilter,
    entityIdFilter,
    entityType,
    seenWhereClauses,
    allFeatureColumnsNeeded,
    featureConditions,
    eventIdConditions,
  };
}

export async function getEntitiesList(props: {
  filters: EntityFilter[];
  limit?: number;
  offset?: number;
}) {
  const { filters, limit, offset } = props;

  const {
    entityType,
    seenFilter,
    seenWithFilter,
    seenWhereClauses,
    allFeatureColumnsNeeded,
    featureConditions,
    entityIdFilter,
    eventIdConditions,
  } = getEntityQueryInfo(filters);

  const seenWhereClause =
    seenWhereClauses.length > 0 ? `${seenWhereClauses.join(" AND ")}` : "1";

  const featureIds = Array.from(
    new Set(
      filters
        .map((f) => {
          if (f.type === EntityFilterType.Feature) {
            return f.data.featureId;
          }
          return null;
        })
        .filter(Boolean)
    )
  );

  const finalQuery1 = `
    SELECT
        features.unique_entity_id AS unique_entity_id,
        count() OVER() AS total_count,
        max(evt_timestamp) AS last_seen,
        min(evt_timestamp) AS first_seen
    FROM (
      SELECT 
          unique_entity_id,
          max(event_timestamp) AS evt_timestamp
      FROM features
      WHERE 1
      ${entityType ? `AND entity_type = '${entityType}'` : ""}
      ${
        featureIds.length > 0
          ? `AND feature_id IN (${featureIds
              .map((id) => `'${id}'`)
              .join(", ")})`
          : ""
      }
      ${
        seenFilter?.to
          ? `AND event_timestamp <= ${getUnixTime(seenFilter.to)}`
          : ""
      }
      ${
        featureConditions.length > 0
          ? `AND (${featureConditions.join(" OR ")})`
          : ""
      }
      ${entityIdFilter ? `AND entity_id = '${entityIdFilter}'` : ""}
      ${
        seenWithFilter
          ? `AND unique_entity_id IN (
                SELECT DISTINCT eav.unique_entity_id_2 AS unique_entity_id
                FROM entity_links_view AS eav
                WHERE eav.unique_entity_id_1 = '${seenWithFilter.type}_${seenWithFilter.id}'
              )`
          : ""
      }
      GROUP BY unique_entity_id
      HAVING 1
      ${
        featureIds.length > 0
          ? `AND count(DISTINCT feature_id) >= ${featureIds.length}`
          : ""
      }
      ${
        seenFilter?.from
          ? `AND evt_timestamp >= ${getUnixTime(seenFilter.from)}`
          : ""
      }
    ) AS features
    GROUP BY
        features.unique_entity_id
    ORDER BY
        last_seen DESC
    LIMIT ${limit ?? 50} OFFSET ${offset ?? 0}
    SETTINGS 
      max_threads = 8,
      join_algorithm = 'parallel_hash';
  `;

  // console.log(finalQuery1);
  if (seenFilter?.from && seenFilter?.to) {
    console.log("+===============================");
    console.log(
      `From: ${format(seenFilter?.from, "MMM d ha")}. To: ${format(
        seenFilter?.to,
        "MMM d ha"
      )}`
    );
    console.log(`Offset: ${seenFilter.from.getTimezoneOffset()}`);
  }
  // const finalQuery1 = `
  //   WITH timestamped_entities AS (
  //       SELECT
  //           unique_entity_id,
  //           min(first_seen) as first_seen,
  //           max(last_seen) as last_seen
  //       FROM entities_seen_mv_table
  //       WHERE ${seenWhereClause}
  //       GROUP BY unique_entity_id
  //   )
  //   SELECT
  //       timestamped_entities.unique_entity_id AS unique_entity_id,
  //       first_seen,
  //       last_seen,
  //       count() OVER() AS total_count
  //   FROM
  //       timestamped_entities
  //   ${featureConditions
  //     .map((clause, idx) => {
  //       const alias = `f_${idx}`;
  //       return `
  //             LEFT SEMI JOIN (
  //                 SELECT unique_entity_id
  //                 FROM latest_entity_features_view AS features
  //                 WHERE
  //                 entity_type = '${entityType}'
  //                 AND ${clause}
  //             ) AS ${alias}
  //             ON timestamped_entities.unique_entity_id = ${alias}.unique_entity_id
  //           `;
  //     })
  //     .join("\n")}
  //   ${eventIdConditions
  //     .map((clause, idx) => {
  //       const alias = `e_${idx}`;
  //       return `
  //           LEFT SEMI JOIN (
  //               SELECT DISTINCT unique_entity_id
  //               FROM features
  //               WHERE ${clause}
  //           ) AS ${alias}
  //           ON timestamped_entities.unique_entity_id = ${alias}.unique_entity_id
  //         `;
  //     })
  //     .join("\n")}
  //   WHERE unique_entity_id != ''
  //   ORDER BY
  //       last_seen DESC
  //   LIMIT ${limit ?? 50} OFFSET ${offset ?? 0}
  //   SETTINGS
  //     max_threads = 8,
  //     join_algorithm = 'parallel_hash';
  // `;

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

  if (entities.data.length === 0) {
    console.debug(finalQuery1);
    console.debug("Early return");
    return {
      count: 0,
      rows: [],
    };
  }

  const finalQuery2 = `
    SELECT
      unique_entity_id,
      entity_type,
      entity_id,
      groupArray((feature_id, value)) as features_array
    FROM (
      SELECT
          unique_entity_id,
          entity_type,
          entity_id,
          feature_id,
          argMax(value, event_timestamp) as value
      FROM features
      WHERE error IS NULL 
      ${
        seenFilter?.to
          ? `AND event_timestamp <= ${getUnixTime(seenFilter.to)}`
          : ""
      }
      AND unique_entity_id IN (${entities.data
        .map((entity) => `'${entity.unique_entity_id}'`)
        .join(", ")})
      GROUP BY unique_entity_id, entity_type, entity_id, feature_id
    ) AS features
    GROUP BY unique_entity_id, entity_type, entity_id
    SETTINGS optimize_move_to_prewhere_if_final = 1
`;
  // const finalQuery2 = `
  //   SELECT
  //       unique_entity_id,
  //       any(entity_type) as entity_type,
  //       any(entity_id) as entity_id,
  //       groupArray((feature_id, value)) as features_array
  //   FROM latest_entity_features_view
  //   WHERE unique_entity_id IN (${entities.data
  //     .map((entity) => `'${entity.unique_entity_id}'`)
  //     .join(", ")})
  //   GROUP BY unique_entity_id
  //   SETTINGS optimize_move_to_prewhere_if_final = 1
  // `;

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

  console.debug();
  console.debug("````````````````````");
  console.debug("Time:", format(new Date(), "h:mm:ss a"));
  console.debug();

  // console.debug(Object.keys(entities));
  console.debug(finalQuery1);
  console.debug("getEntitiesList - desired_entities");
  printEntityFilters(filters);
  console.debug(entities.statistics);
  console.debug();
  // console.debug(Object.keys(entities2));
  // console.debug(finalQuery2);
  console.debug("getEntitiesList - features");
  console.debug(entities2.statistics);
  console.debug("....................");
  console.debug();

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

  // console.debug(JSON.stringify(eventsDetailsResult.data[0], null, 2));

  console.debug();
  console.debug("````````````````````");
  console.debug("getEventsList");
  printEventFilters(filters);
  console.debug(eventIDsResult.statistics);
  console.debug(eventsDetailsResult.statistics);
  console.debug("....................");
  console.debug();

  return eventsDetailsResult.data;
};

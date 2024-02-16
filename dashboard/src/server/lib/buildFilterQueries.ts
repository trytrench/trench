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
  cursor?: number;
}) {
  const { filters, limit, cursor } = props;

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
        FROM entity_seen
        WHERE 1
        ${
          seenWithEntity
            ? `AND unique_entity_id IN (
                SELECT eav.unique_entity_id_2 AS unique_entity_id
                FROM entity_appearance_view AS eav
                WHERE eav.unique_entity_id_1 = '${seenWithEntity.type}_${seenWithEntity.id}'
            )`
            : ""
        }
        ${seenWhereClause}
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
                FROM entity_features_view AS features
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
        LIMIT ${limit ?? 50} OFFSET ${cursor ?? 0}
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
    FROM entity_features_view
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
  }

  const whereClauses = [...eventWhereClauses, ...featureWhereClauses];
  const whereClausesExist = whereClauses.length > 0;

  const finalQuery = `
    WITH desired_event_ids AS (
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
            ? `
            AND events.id IN (SELECT event_id FROM (
              SELECT event_id, entity_type, entity_id
              FROM features AS features
              WHERE feature_type = 'EntityAppearance'
              AND ${entityApperanceWhereClauses.join(" AND ")}
              GROUP BY event_id, entity_type, entity_id
            ))`
            : ""
        }
        ${whereClausesExist ? `AND ${whereClauses.join(" AND ")}` : ""}
        ORDER BY events.id DESC
        LIMIT ${limit ?? 50} OFFSET ${cursor ?? 0}
    ),
    event_features AS (
        SELECT
            event_id,
            groupArray(tuple(feature_id, value, error)) AS features_arr
        FROM features AS features
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
    LEFT JOIN (
        SELECT
            entity_type,
            entity_id,
            event_id
        FROM features AS features
        WHERE feature_type = 'EntityAppearance'
            AND event_id IN (SELECT event_id FROM desired_event_ids)
        GROUP BY event_id, entity_type, entity_id
    ) AS ea 
    ON desired_event_ids.event_id = ea.event_id
    LEFT JOIN (
        SELECT * FROM events
        WHERE id IN (SELECT event_id FROM desired_event_ids)
    ) AS e
    ON desired_event_ids.event_id = e.id
    LEFT JOIN (
        SELECT * FROM event_features
        WHERE event_id IN (SELECT event_id FROM desired_event_ids)
    ) AS ef
    ON desired_event_ids.event_id = ef.event_id
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
    entities: Array<[string, string]>;
    features_array: Array<[string, string | null, string | null]>;
  };

  const events = await result.json<{
    data: EventResult[];
    statistics: any;
  }>();

  console.log();
  // console.log(finalQuery);
  console.log("````````````````````");
  console.log("getEventsList");
  printEventFilters(filter);
  console.log(events.statistics);
  console.log("....................");
  console.log();

  return events.data;
};

import {
  DataType,
  Entity,
  FeatureDef,
  TypedDataMap,
  decodeTypedData,
  getFeatureDefFromSnapshot,
} from "event-processing";
import { get, uniq, uniqBy } from "lodash";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db, prisma } from "~/server/db";
import { getOrderedFeatures } from "~/server/lib/features";
import { JsonFilter, JsonFilterOp } from "../../../shared/jsonFilter";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";
import { getEntitiesList, getEventsList } from "../../lib/buildFilterQueries";

export const listsRouter = createTRPCRouter({
  getEntitiesList: protectedProcedure
    .input(
      z.object({
        entityFilters: entityFiltersZod,
        sortBy: z
          .object({
            feature: z.string(),
            direction: z.enum(["asc", "desc"]),
            dataType: z.enum(["text", "number", "boolean"]),
          })
          .optional(),
        limit: z.number().optional(),
        cursor: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.entityFilters;

      const entities = await getEntitiesList({
        filters: filters,
        limit: input.limit,
        cursor: input.cursor,
      });

      const featureDefs = await getLatestFeatureDefs();

      return {
        count: 0,
        rows: entities.map((entity) => {
          const entityType = entity.entity_type[0];
          const entityId = entity.entity_id[0];
          return {
            entityType,
            entityId,
            firstSeenAt: new Date(entity.first_seen),
            lastSeenAt: new Date(entity.last_seen),
            features: getAnnotatedFeatures(featureDefs, entity.features_array),
          };
        }),
      };
    }),

  getEventsList: protectedProcedure
    .input(
      z.object({
        eventFilters: eventFiltersZod,
        cursor: z.number().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.eventFilters;

      const events = await getEventsList({
        filter: filters,
        limit: input.limit,
        cursor: input.cursor,
      });

      const featureDefs = await getLatestFeatureDefs();

      return {
        count: 0,
        rows: events.map((event) => ({
          id: event.event_id,
          type: event.event_type,
          timestamp: new Date(event.event_timestamp),
          data: JSON.parse(event.event_data),
          entities: getUniqueEntities(event.entities),
          features: getAnnotatedFeatures(featureDefs, event.features_array),
        })),
      };
    }),

  // prob doesnt work
  getFeatureColumnsForEventType: protectedProcedure
    .input(
      z.object({
        eventType: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const vals = await ctx.prisma.eventFeature.findMany({
        where: {
          eventType: input.eventType,
        },
      });
      return vals;
    }),

  getEvent: protectedProcedure
    .input(
      z.object({
        eventId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const event = await ctx.prisma.event.findUnique({
        where: {
          id: input.eventId,
        },
        include: {
          eventLabels: true,
          eventType: true,
          entityLinks: {
            include: {
              entity: {
                include: {
                  entityLabels: true,
                },
              },
            },
          },
        },
      });
      return event;
    }),

  getEventsOfType: protectedProcedure
    .input(
      z.object({
        eventTypeId: z.string(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [count, rows] = await Promise.all([
        ctx.prisma.event.count({
          where: {
            eventType: {
              id: input.eventTypeId,
            },
          },
        }),
        ctx.prisma.event.findMany({
          where: {
            eventType: {
              id: input.eventTypeId,
            },
          },
          include: {
            eventLabels: true,
            eventType: true,
          },
          orderBy: {
            timestamp: "desc",
          },
          take: input.limit,
          skip: input.offset,
        }),
      ]);
      return {
        count,
        rows,
      };
    }),
});

const getFeatureSortKey = (
  column: string,
  sortBy: {
    feature: string;
    direction: "asc" | "desc";
    dataType: "text" | "number" | "boolean";
  }
) => {
  const { feature, direction, dataType } = sortBy;
  return dataType === "number"
    ? `toInt32OrZero(JSONExtractString(${column}, '${feature}')) ${direction}`
    : `JSONExtractString(${column}, '${feature}') ${direction}`;
};

const getFeatureQuery = (filter: JsonFilter, column: string) => {
  const { path, op, value, dataType } = filter;
  const feature =
    dataType === "number"
      ? `toInt32OrZero(JSONExtractString(${column}, '${path}'))`
      : `JSONExtractString(${column}, '${path}')`;

  if (op === JsonFilterOp.IsEmpty) {
    if (dataType === "text")
      return `AND (${feature} IS NULL OR ${feature} = '')`;
    else return `AND ${feature} IS NULL`;
  }
  if (op === JsonFilterOp.NotEmpty) {
    if (dataType === "text")
      return `AND (${feature} IS NOT NULL AND ${feature} != '')`;
    else return `AND ${feature} IS NOT NULL`;
  }

  if (value === undefined) return "";

  const comparisonOps = {
    [JsonFilterOp.Equal]: "=",
    [JsonFilterOp.NotEqual]: "!=",
    [JsonFilterOp.GreaterThan]: ">",
    [JsonFilterOp.LessThan]: "<",
  };

  if (comparisonOps[op])
    return `AND ${feature} ${comparisonOps[op]} ${
      dataType === "number" ? value : `'${value}'`
    }`;

  const stringOps = {
    [JsonFilterOp.Contains]: `LIKE '%${value}%'`,
    [JsonFilterOp.DoesNotContain]: `NOT LIKE '%${value}%'`,
    [JsonFilterOp.StartsWith]: `LIKE '${value}%'`,
    [JsonFilterOp.EndsWith]: `LIKE '%${value}'`,
  };

  if (stringOps[op]) return `AND ${feature} ${stringOps[op]}`;
};

function getUniqueEntities(
  entities_array: Array<[string[], string[]]>
): Entity[] {
  const entities: Entity[] = [];
  for (const [entity_types, entity_ids] of entities_array) {
    for (let i = 0; i < entity_ids.length; i++) {
      const entity_id = entity_ids[i];
      const entity_type = entity_types[i];
      const found = entities.some(
        (entity) => entity.id === entity_id && entity.type === entity_type
      );
      if (found) {
        continue;
      }
      if (!entity_id || !entity_type) {
        throw new Error("Invalid entity array from clickhouse");
      }
      entities.push({ id: entity_id, type: entity_type });
    }
  }
  return entities;
}

type AnnotatedFeature = {
  featureId: string;
  featureType: string;
  featureName: string;
  result:
    | {
        type: "error";
        message: string;
      }
    | {
        type: "success";
        data: TypedDataMap[DataType];
      };
};

function getAnnotatedFeatures(
  featureDefs: FeatureDef[],
  featuresArray: Array<[string, string | null, string | null]> // featureId, value, error
) {
  const featureDefsMap = new Map<string, FeatureDef>();
  for (const featureDef of featureDefs) {
    featureDefsMap.set(featureDef.featureId, featureDef);
  }

  const annotatedFeatures: AnnotatedFeature[] = [];
  for (const [featureId, value, error] of featuresArray) {
    const featureDef = featureDefsMap.get(featureId);
    if (!featureDef) {
      continue;
    }

    annotatedFeatures.push({
      featureId,
      featureType: featureDef.featureType,
      featureName: featureDef.featureName,
      result: error
        ? { type: "error", message: error }
        : {
            type: "success",
            data: decodeTypedData(featureDef.dataType, value ?? ""),
          },
    });
  }

  return annotatedFeatures;
}

async function getLatestFeatureDefs() {
  const latestSnapshots = await prisma.featureDefSnapshot.findMany({
    distinct: ["featureDefId"],
    orderBy: {
      createdAt: "desc",
    },
    include: {
      featureDef: true,
    },
  });

  const featureDefs = latestSnapshots.map((snapshot) =>
    getFeatureDefFromSnapshot({ featureDefSnapshot: snapshot })
  );

  return featureDefs;
}

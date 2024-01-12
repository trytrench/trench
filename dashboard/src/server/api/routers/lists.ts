import {
  Entity,
  FeatureDef,
  TSchema,
  TypeName,
  TypedData,
  createDataType,
  getNodeDefFromSnapshot,
  getTypedData,
} from "event-processing";
import { get, uniq, uniqBy } from "lodash";
import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "~/server/api/trpc";
import { db, prisma } from "~/server/db";
import { JsonFilter, JsonFilterOp } from "../../../shared/jsonFilter";
import { entityFiltersZod, eventFiltersZod } from "../../../shared/validation";
import { getEntitiesList, getEventsList } from "../../lib/buildFilterQueries";
import { nanoid } from "nanoid";
import { EntityType } from "@prisma/client";
import { AnnotatedFeature } from "../../../shared/types";

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
      const entityTypes = await prisma.entityType.findMany();

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
            features: getAnnotatedFeatures(
              featureDefs,
              entityTypes,
              entity.features_array
            ),
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
      const entityTypes = await prisma.entityType.findMany();

      return {
        count: 0,
        rows: events.map((event) => ({
          id: event.event_id,
          type: event.event_type,
          timestamp: new Date(event.event_timestamp),
          data: JSON.parse(event.event_data),
          entities: getUniqueEntities(event.entities),
          features: getAnnotatedFeatures(
            featureDefs,
            entityTypes,
            event.features_array
          ),
        })),
      };
    }),
});

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

function getAnnotatedFeatures(
  featureDefs: FeatureDef[],
  entityTypes: EntityType[],
  featuresArray: Array<[string, string | null, string | null]> // featureId, value, error
) {
  const featureDefsMap = new Map<string, FeatureDef>();
  for (const featureDef of featureDefs) {
    featureDefsMap.set(featureDef.id, featureDef);
  }

  const entityTypesMap = new Map<string, string>();
  for (const entityType of entityTypes) {
    entityTypesMap.set(entityType.id, entityType.type);
  }

  const annotatedFeatures: AnnotatedFeature[] = [];
  for (const [featureId, value, error] of featuresArray) {
    const featureDef = featureDefsMap.get(featureId);
    if (featureDef) {
      const parsed = JSON.parse(value ?? "null");

      annotatedFeatures.push({
        featureId,
        featureName: featureDef.name,
        result: error
          ? { type: "error", message: error }
          : {
              type: "success",
              data: getTypedData(parsed, featureDef.schema),
            },
      });
      continue;
    }

    const entityType = entityTypesMap.get(featureId);
    if (entityType) {
      const parsed = JSON.parse(value ?? "null");
      annotatedFeatures.push({
        featureId,
        featureName: entityType,
        result: error
          ? { type: "error", message: error }
          : {
              type: "success",
              data: getTypedData(parsed, {
                type: TypeName.Entity,
                entityType: featureId,
              }),
            },
      });
      continue;
    }
  }

  return annotatedFeatures;
}

async function getLatestFeatureDefs(): Promise<FeatureDef[]> {
  const result = await prisma.feature.findMany({
    orderBy: { createdAt: "desc" },
  });

  return result.map((f) => {
    return {
      id: f.id,
      name: f.name,
      description: f.description ?? undefined,
      schema: f.schema as unknown as TSchema,
      entityTypeId: f.entityTypeId,
    };
  });
}

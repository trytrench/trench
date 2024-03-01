import {
  Entity,
  FeatureDef,
  TSchema,
  TypeName,
  TypedData,
  createDataType,
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
import { getAnnotatedFeatures, getLatestFeatureDefs } from "../../lib/features";

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
        cursor: z.number().optional(), // offset, named "cursor" for compatibility with react-query
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.entityFilters;

      const { rows: entities, count } = await getEntitiesList({
        filters: filters,
        limit: input.limit,
        offset: input.cursor,
      });

      const featureDefs = await getLatestFeatureDefs();
      const entityTypes = await prisma.entityType.findMany();
      const rules = await prisma.rule.findMany();

      return {
        count: count,
        rows: entities.map((entity) => {
          const entityType = entity.entity_type;
          const entityId = entity.entity_id;
          const features = getAnnotatedFeatures(
            featureDefs,
            entityTypes,
            entity.features_array,
            rules
          );
          const nameFeature = features.find(
            (f) =>
              f.result.type === "success" &&
              f.result.data.schema.type === TypeName.Name
          );
          const entityName: string =
            nameFeature?.result.type === "success"
              ? nameFeature.result.data.value
              : entityId;

          return {
            entityType,
            entityId,
            entityName,
            firstSeenAt: new Date(entity.first_seen),
            lastSeenAt: new Date(entity.last_seen),
            features: features,
          };
        }),
      };
    }),

  getEventsList: protectedProcedure
    .input(
      z.object({
        eventFilters: eventFiltersZod,
        cursor: z.number().optional(), // offset, named "cursor" for compatibility with react-query
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = input.eventFilters;

      const [events, featureDefs, entityTypes, rules] = await Promise.all([
        getEventsList({
          filter: filters,
          limit: input.limit,
          offset: input.cursor,
        }),
        getLatestFeatureDefs(),
        prisma.entityType.findMany(),
        prisma.rule.findMany(),
      ]);

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
            event.features,
            rules
          ),
        })),
      };
    }),
});

function getUniqueEntities(entities_array: Array<[string, string]>): Entity[] {
  const entities: Entity[] = uniqBy(
    entities_array,
    ([entity_type, entity_id]) => [entity_type, entity_id].join()
  ).map(([entity_type, entity_id]) => ({
    type: entity_type,
    id: entity_id,
  }));

  return entities;
}

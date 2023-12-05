import { DataType, FeatureType } from "event-processing";
import { z } from "zod";
import { jsonFilterZod } from "./jsonFilter";

export const dateRangeZod = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

export type DateRange = z.infer<typeof dateRangeZod>;

export const featureFiltersZod = z.union([
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.enum([DataType.Float64, DataType.Int64]),
    value: z.object({
      eq: z.number().optional(),
      gt: z.number().optional(),
      lt: z.number().optional(),
      gte: z.number().optional(),
      lte: z.number().optional(),
    }),
  }),
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.literal(DataType.String),
    value: z.object({
      eq: z.string().optional(),
      contains: z.string().optional(),
    }),
  }),
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.literal(DataType.Boolean),
    value: z.object({
      eq: z.boolean().optional(),
    }),
  }),
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.literal(DataType.Entity),
    value: z.object({
      eq: z
        .object({
          entityType: z.string(),
          entityId: z.string(),
        })
        .optional(),
    }),
  }),
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.literal(DataType.Object),
    value: z.object({}),
  }),
]);

export const genericFiltersZod = z
  .object({
    dateRange: dateRangeZod.optional(),
    type: z.string().optional(),
    labels: z.array(z.string()).optional(),
    features: z.array(jsonFilterZod).optional(),
  })
  .optional();

export type GenericFilters = z.infer<typeof genericFiltersZod>;

export const eventFiltersZod = z.object({
  dateRange: z
    .object({
      from: z.date().optional(),
      to: z.date().optional(),
    })
    .optional(),
  eventType: z.string().optional(),
  features: z.array(featureFiltersZod).optional(),
  entityIds: z.array(z.string()).optional(),

  // old
  eventLabels: z.array(z.string()).optional(),
  eventFeatures: z.array(jsonFilterZod).optional(),
  entityId: z.string().optional(),
});

export type EventFilters = z.infer<typeof eventFiltersZod>;

export const entityFiltersZod = z.object({
  firstSeen: dateRangeZod.optional(),
  lastSeen: dateRangeZod.optional(),
  entityType: z.string().optional(),
  features: z.array(featureFiltersZod).optional(),

  // old
  entityId: z.string().optional(),
  entityLabels: z.array(z.string()).optional(),
  entityFeatures: z.array(jsonFilterZod).optional(),
});

export type EntityFilters = z.infer<typeof entityFiltersZod>;

export const findTopEntitiesArgs = z.object({
  limit: z.number().optional(),
  eventFilters: eventFiltersZod.optional(),
  entityFilters: entityFiltersZod.optional(),
  linkType: z.string().optional(),
});

export type FindTopEntitiesArgs = z.infer<typeof findTopEntitiesArgs>;

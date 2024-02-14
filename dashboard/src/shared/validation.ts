import { TypeName } from "event-processing";
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
    dataType: z.enum([TypeName.Float64, TypeName.Int64]),
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
    dataType: z.enum([TypeName.String, TypeName.Name]),
    value: z.object({
      eq: z.string().optional(),
      contains: z.string().optional(),
    }),
  }),
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.literal(TypeName.Boolean),
    value: z.object({
      eq: z.boolean().optional(),
    }),
  }),
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.literal(TypeName.Entity),
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
    dataType: z.literal(TypeName.Object),
    value: z.object({}),
  }),
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.literal(TypeName.Array),
    value: z.any(),
  }),
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.literal(TypeName.Any),
    value: z.any(),
  }),
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.literal(TypeName.Location),
    value: z.any(),
  }),
  z.object({
    featureId: z.string(),
    featureName: z.string().optional(),
    dataType: z.enum([TypeName.Date, TypeName.Rule, TypeName.Tuple]),
    value: z.any(),
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
  entities: z
    .array(
      z.object({
        type: z.string(),
        id: z.string(),
      })
    )
    .optional(),
});

export type EventFilters = z.infer<typeof eventFiltersZod>;

export const entityFiltersZod = z.object({
  firstSeen: dateRangeZod.optional(),
  lastSeen: dateRangeZod.optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  features: z.array(featureFiltersZod).optional(),

  eventId: z.string().optional(),
  seenWithEntity: z
    .object({
      type: z.string(),
      id: z.string(),
    })
    .optional(),
  seenInEventType: z.string().optional(),

  // old
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

export const entityViewConfigZod = z.object({
  type: z.enum(["list", "grid"]),
  filters: entityFiltersZod,
  tableConfig: z
    .object({
      columnOrder: z.array(z.string()),
      columnVisibility: z.record(z.boolean()),
    })
    .optional(),
  gridConfig: z
    .object({
      featureOrder: z.array(z.string()),
    })
    .optional(),
});

export type EntityViewConfig = z.infer<typeof entityViewConfigZod>;

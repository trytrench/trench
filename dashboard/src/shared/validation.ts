import { z } from "zod";
import { jsonFilterZod } from "./jsonFilter";

export const genericFiltersZod = z
  .object({
    dateRange: z
      .object({
        from: z.number(),
        to: z.number(),
      })
      .optional(),
    type: z.string().optional(),
    labels: z.array(z.string()).optional(),
    features: z.array(jsonFilterZod).optional(),
  })
  .optional();

export type GenericFilters = z.infer<typeof genericFiltersZod>;

export const eventFiltersZod = z
  .object({
    dateRange: z
      .object({
        from: z.number(),
        to: z.number(),
      })
      .optional(),
    eventType: z.string().optional(),
    eventLabels: z.array(z.string()).optional(),
    eventFeatures: z.array(jsonFilterZod).optional(),
    entityId: z.string().optional(),
  })
  .optional();

export type EventFilters = z.infer<typeof eventFiltersZod>;

export const entityFiltersZod = z
  .object({
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    entityLabels: z.array(z.string()).optional(),
    entityFeatures: z.array(jsonFilterZod).optional(),
  })
  .optional();

export type EntityFilters = z.infer<typeof entityFiltersZod>;

export const findTopEntitiesArgs = z.object({
  limit: z.number().optional(),
  eventFilters: eventFiltersZod.optional(),
  entityFilters: entityFiltersZod.optional(),
  linkType: z.string().optional(),
});

export type FindTopEntitiesArgs = z.infer<typeof findTopEntitiesArgs>;

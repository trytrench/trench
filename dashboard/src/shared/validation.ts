import { z } from "zod";

export const eventFiltersZod = z
  .object({
    dateRange: z
      .object({
        start: z.number(),
        end: z.number(),
      })
      .nullable(),
    eventType: z.string().nullable(),
    eventLabels: z.array(z.string()).nullable(),
  })
  .optional();

export type EventFilters = z.infer<typeof eventFiltersZod>;

export const entityFiltersZod = z
  .object({
    entityType: z.string().nullable(),
    entityId: z.string().nullable(),
    entityLabels: z.array(z.string()).nullable(),
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

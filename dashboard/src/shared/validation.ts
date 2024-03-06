import { TypeName } from "event-processing";
import { z } from "zod";
import { jsonFilterZod } from "./jsonFilter";

export const dateRangeZod = z.object({
  from: z.date().optional(),
  to: z.date().optional(),
});

export type DateRange = z.infer<typeof dateRangeZod>;

export const featureFilterDataZod = z.union([
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
    dataType: z.enum([
      TypeName.Date,
      TypeName.Rule,
      TypeName.Tuple,
      TypeName.Union,
      TypeName.Null,
      TypeName.Undefined,
    ]),
    value: z.any(),
  }),
]);

export type FeatureFilter = z.infer<typeof featureFilterDataZod>;

export enum EventFilterType {
  EventType = "EventType",
  DateRange = "DateRange",
  Feature = "Feature",
  Entities = "Entities",
}
const dateFilterZod = z.object({
  type: z.literal(EventFilterType.DateRange),
  data: dateRangeZod,
});

const featureFilterZod = z.object({
  type: z.literal(EventFilterType.Feature),
  data: featureFilterDataZod,
});

const eventTypeFilterZod = z.object({
  type: z.literal(EventFilterType.EventType),
  data: z.string(),
});

const entityFilterByZod = z.object({
  type: z.literal(EventFilterType.Entities),
  data: z.array(
    z.object({
      type: z.string(),
      id: z.string(),
    })
  ),
});

export const eventFilterZod = z.union([
  dateFilterZod,
  featureFilterZod,
  eventTypeFilterZod,
  entityFilterByZod,
]);

export type EventFilter = z.infer<typeof eventFilterZod>;

// Entity Filters

export enum EntityFilterType {
  EntityType = "EntityType",
  EntityId = "EntityId",
  FirstSeen = "FirstSeen",
  LastSeen = "LastSeen",
  Feature = "Feature",
  SeenWithEntity = "SeenWithEntity",
  SeenInEventType = "SeenInEventType",
  SeenInEventId = "SeenInEventId",
}

const entityTypeFilterZod = z.object({
  type: z.literal(EntityFilterType.EntityType),
  data: z.string(),
});

const entityIdFilterZod = z.object({
  type: z.literal(EntityFilterType.EntityId),
  data: z.string(),
});

const firstSeenFilterZod = z.object({
  type: z.literal(EntityFilterType.FirstSeen),
  data: dateRangeZod,
});

const lastSeenFilterZod = z.object({
  type: z.literal(EntityFilterType.LastSeen),
  data: dateRangeZod,
});

const entityFeatureFilterZod = z.object({
  type: z.literal(EntityFilterType.Feature),
  data: featureFilterDataZod,
});

const seenWithEntityFilterZod = z.object({
  type: z.literal(EntityFilterType.SeenWithEntity),
  data: z.object({
    type: z.string(),
    id: z.string(),
  }),
});

const seenInEventTypeFilterZod = z.object({
  type: z.literal(EntityFilterType.SeenInEventType),
  data: z.string(),
});

const seenInEventIdFilterZod = z.object({
  type: z.literal(EntityFilterType.SeenInEventId),
  data: z.string(),
});

export const entityFiltersZod = z.union([
  entityTypeFilterZod,
  entityIdFilterZod,
  firstSeenFilterZod,
  lastSeenFilterZod,
  entityFeatureFilterZod,
  seenWithEntityFilterZod,
  seenInEventTypeFilterZod,
  seenInEventIdFilterZod,
]);

export type EntityFilter = z.infer<typeof entityFiltersZod>;

// Entity View Config

export const entityViewConfigZod = z.object({
  type: z.enum(["list", "grid"]),
  filters: z.array(entityFiltersZod),
  tableConfig: z
    .object({
      columnOrder: z.array(z.string()),
      columnVisibility: z.record(z.boolean()),
      columnSizing: z.record(z.number()),
    })
    .optional(),
  gridConfig: z
    .object({
      featureOrder: z.array(z.string()),
    })
    .optional(),
});

export type EntityViewConfig = z.infer<typeof entityViewConfigZod>;

export const eventViewConfig = z.object({
  filters: z.array(eventFilterZod),
  type: z.enum(["feed", "grid"]),
  tableConfig: z
    .object({
      columnOrder: z.array(z.string()),
      columnVisibility: z.record(z.boolean()),
      columnSizing: z.record(z.number()),
    })
    .optional(),
  gridConfig: z
    .record(
      z.object({
        featureOrder: z.record(z.array(z.string())),
        entityTypeOrder: z.array(z.string()),
      })
    )
    .optional(),
});

export type EventViewConfig = z.infer<typeof eventViewConfig>;

export function getEventFiltersOfType<T extends EventFilterType>(
  filters: EventFilter[],
  type: T
): Extract<EventFilter, { type: T }>[] {
  return filters.filter((filter) => filter.type === type) as any;
}

export function getEntityFiltersOfType<T extends EntityFilterType>(
  filters: EntityFilter[],
  type: T
): Extract<EntityFilter, { type: T }>[] {
  return filters.filter((filter) => filter.type === type) as any;
}

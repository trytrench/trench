import type { EntityType, EventType, Feature } from "@prisma/client";

type CommonArgs = {
  features: Feature[];
  entities: (Record<string, string> & { id: string; type: string })[];
  entityTypes: (EntityType & {
    nameFeature: (EntityFeature & { feature: Feature }) | null;
  })[];
  isRule?: boolean;
};

type EventArgs = {
  type: "event";
  eventOrEntity: { type: string; features: Record<string, string> };
  eventOrEntityTypes: EventType[];
  eventOrEntityFeatures: (EventFeature & { eventType: EventType })[];
} & CommonArgs;

type EntityArgs = {
  type: "entity";
  eventOrEntity: { type: string; features: Record<string, string> };
  eventOrEntityTypes: EntityType[];
  eventOrEntityFeatures: (EntityFeature & { entityType: EntityType })[];
} & CommonArgs;

type FunctionArg = EventArgs | EntityArgs;

export function getOrderedFeatures({
  type,
  eventOrEntity,
  eventOrEntityTypes,
  eventOrEntityFeatures,
  features,
  entities,
  entityTypes,
  isRule,
}: FunctionArg) {
  // Find the event type for the current event
  const eventOrEntityType = eventOrEntityTypes.find(
    (type) => type.type === eventOrEntity.type
  );
  if (!eventOrEntityType) return [];

  const filteredEventOrEntityFeatures =
    type === "event"
      ? eventOrEntityFeatures.filter(
          (feature) => feature.eventType.type === eventOrEntity.type
        )
      : eventOrEntityFeatures.filter(
          (feature) => feature.entityType.type === eventOrEntity.type
        );

  const featureOverrides = filteredEventOrEntityFeatures.reduce(
    (acc, feature) => {
      acc[feature.featureId] = feature;
      return acc;
    },
    {} as Record<string, EventFeature | EntityFeature>
  );

  const featureMap = features.reduce(
    (acc, feature) => {
      acc[feature.id] = feature;
      return acc;
    },
    {} as Record<string, Feature>
  );

  const entityTypeToNameFeature = entityTypes.reduce(
    (acc, type) => ({
      ...acc,
      [type.type]: type.nameFeature?.feature.feature,
    }),
    {} as Record<string, string | undefined>
  );

  const orderKey = isRule ? "ruleOrder" : "featureOrder";

  // Get the features for the event with overrides applied
  const orderedFeatures = eventOrEntityType[orderKey].map((featureId) => {
    const featureData = featureMap[featureId];
    if (!featureData) throw new Error(`Feature ${featureId} not found`);

    if (featureData.dataType === "entity") {
      const entityId = eventOrEntity.features[featureData.feature];
      const entityData = entities.find((e) => e.id === entityId);
      if (!entityData || !entityId)
        return {
          id: featureId,
          name: featureOverrides[featureId]?.name ?? featureData.feature,
          value: undefined,
          dataType: featureData.dataType,
        };

      const entityNameFeature = entityTypeToNameFeature[entityData.type];
      const entityName = entityNameFeature && entityData[entityNameFeature];

      return {
        id: featureId,
        name: featureOverrides[featureId]?.name ?? featureData.feature,
        value: eventOrEntity.features[featureData.feature],
        dataType: featureData.dataType,
        entityName,
        entityType: entityData.type,
      };
    }

    return {
      id: featureId,
      name: featureOverrides[featureId]?.name ?? featureData.feature,
      value: eventOrEntity.features[featureData.feature],
      dataType: featureData.dataType,
      color: featureOverrides[featureId]?.color,
    };
  });

  if (isRule)
    return orderedFeatures.filter((feature) => feature.value === "true");
  return orderedFeatures;
}

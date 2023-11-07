import {
  EntityFeature,
  EntityType,
  EventFeature,
  EventType,
  Feature,
} from "@prisma/client";

export function getOrderedFeaturesForEvent(
  event,
  eventTypes: EventType[],
  eventFeatures: (EventFeature & { eventType: EventType })[],
  features: Feature[],
  entityTypes: (EntityType & {
    nameFeature: (EntityFeature & { feature: Feature }) | null;
  })[],
  entities: { id: string; type: string }[]
) {
  // Find the event type for the current event
  const eventType = eventTypes.find((et) => et.type === event.type);

  // Build a map of feature overrides for this event type
  const featureOverrides = eventFeatures
    .filter((ef) => ef.eventType.type === event.type)
    .reduce(
      (acc, ef) => {
        acc[ef.featureId] = ef.name;
        return acc;
      },
      {} as Record<string, string>
    );

  // Build a map of feature names for quick lookup
  const featureMap = features.reduce(
    (acc, feature) => {
      acc[feature.id] = feature;
      return acc;
    },
    {} as Record<string, Feature>
  );

  const entityTypeToName = entityTypes.reduce(
    (acc, type) => ({
      ...acc,
      [type.type]: type.nameFeature.feature.feature,
    }),
    {} as Record<string, string>
  );

  // Get the features for the event with overrides applied
  const orderedFeatures = eventType.featureOrder.map((featureId) => {
    const featureData = featureMap[featureId];
    if (!featureData) throw new Error(`Feature ${featureId} not found`);

    if (featureData.dataType === "entity") {
      const entityId = event.features[featureData.feature];
      const entityData = entities.find((e) => e.id === entityId);
      if (!entityData)
        return {
          id: featureId,
          name: featureOverrides[featureId] ?? featureData.feature,
          value: null,
          dataType: featureData.dataType,
        };

      const entityName = entityData[entityTypeToName[entityData.type]];

      return {
        id: featureId,
        name: featureOverrides[featureId] ?? featureData.feature,
        value: event.features[featureData.feature],
        dataType: featureData.dataType,
        entityName,
        entityType: entityData.type,
      };
    }

    return {
      id: featureId,
      name: featureOverrides[featureId] ?? featureData.feature,
      value: event.features[featureData.feature],
      dataType: featureData.dataType,
    };
  });

  return orderedFeatures;
}

export function getOrderedFeaturesForEntity(
  entity,
  entityTypes: (EntityType & {
    nameFeature: (EntityFeature & { feature: Feature }) | null;
  })[],
  entityFeatures: (EntityFeature & { entityType: EntityType })[],
  features: Feature[],
  entityNames: { id: string; type: string }[]
) {
  // Find the entity type for the current entity
  const entityType = entityTypes.find((et) => et.type === entity.type);
  if (!entityType) throw new Error("Entity type not found");

  // Build a map of feature overrides for this entity type
  const featureOverrides = entityFeatures
    .filter((ef) => ef.entityType.type === entity.type)
    .reduce(
      (acc, ef) => {
        acc[ef.featureId] = ef.name;
        return acc;
      },
      {} as Record<string, string>
    );

  // Build a map of feature names for quick lookup
  const featureMap = features.reduce(
    (acc, feature) => {
      acc[feature.id] = feature;
      return acc;
    },
    {} as Record<string, string>
  );

  const entityTypeToName = entityTypes.reduce(
    (acc, type) => ({
      ...acc,
      [type.type]: type.nameFeature.feature.feature,
    }),
    {} as Record<string, string>
  );

  // Get the features for the entity with overrides applied
  const orderedFeatures = entityType.featureOrder.map((featureId) => {
    const featureData = featureMap[featureId];
    if (!featureData) throw new Error(`Feature ${featureId} not found`);

    if (featureData.dataType === "entity") {
      const entityId = entity[featureData.feature];
      const entityData = entityNames.find((e) => e.id === entityId);

      const entityName = entityData[entityTypeToName[entityData.type]];

      return {
        id: featureId,
        name: featureOverrides[featureId] ?? featureData.feature,
        value: entity[featureData.feature],
        dataType: featureData.dataType,
        entityName,
        entityType: entityData.type,
      };
    }

    return {
      id: featureId,
      name: featureOverrides[featureId] ?? featureData.feature,
      value: entity[featureData.feature],
      dataType: featureData.dataType,
    };
  });

  return orderedFeatures;
}

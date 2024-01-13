import type { EntityType, EventType, Feature } from "@prisma/client";
import { FeatureDef, TSchema, TypeName, getTypedData } from "event-processing";
import { AnnotatedFeature } from "../../shared/types";
import { prisma } from "databases";

export function getAnnotatedFeatures(
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
    }
  }

  console.log(annotatedFeatures);

  // console.log(JSON.stringify(annotatedFeatures, null, 2));

  return annotatedFeatures;
}

export async function getLatestFeatureDefs(): Promise<FeatureDef[]> {
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

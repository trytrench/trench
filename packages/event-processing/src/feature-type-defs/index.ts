import { z } from "zod";
import { FeatureDef, FeatureTypeDef } from "./featureTypeDef";
import { computedFeatureDef } from "./types/Computed";
import { countFeatureDef } from "./types/Count";
import { entityAppearanceFeatureDef } from "./types/EntityAppearance";
import { uniqueCountFeatureDef } from "./types/UniqueCount";
import { FeatureType } from "./types/_enum";

export const FEATURE_TYPE_DEFS = {
  [FeatureType.Computed]: computedFeatureDef,
  [FeatureType.Count]: countFeatureDef,
  [FeatureType.UniqueCount]: uniqueCountFeatureDef,
  [FeatureType.EntityAppearance]: entityAppearanceFeatureDef,
} satisfies {
  [TFeatureType in FeatureType]: FeatureTypeDef<TFeatureType, any, any, any>;
};

export type FeatureTypeDefs = typeof FEATURE_TYPE_DEFS;

export type FeatureDefs = {
  [TFeatureType in FeatureType]: FeatureDef<
    TFeatureType,
    FeatureTypeDefs[TFeatureType]["allowedDataTypes"][number],
    FeatureTypeDefs[TFeatureType]["configSchema"]["_input"]
  >;
};

const featureDefZodSchema = z.union([
  z.string(),
  z.string(),
  ...Object.values(FEATURE_TYPE_DEFS).map((def) =>
    z.object({
      featureId: z.string(),
      featureType: z.enum([def.featureType]),
      dataType: z.enum(["_", ...def.allowedDataTypes]),
      dependsOn: z.set(z.string()),
      config: def.configSchema,
    })
  ),
]);

export * from "./featureTypeDef";
export * from "./types/_enum";

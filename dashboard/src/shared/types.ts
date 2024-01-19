import { Rule } from "@prisma/client";
import { TSchema, TypedData } from "event-processing";

export type FeaturePathItem = {
  featureId: string;
  schema: TSchema;
};

export type AnnotatedFeature = {
  featureId: string;
  featureName: string;
  rule?: Rule;
  result:
    | {
        type: "error";
        message: string;
      }
    | {
        type: "success";
        data: TypedData;
      };
};

import { type Rule } from "@prisma/client";
import { type TypedData } from "event-processing";

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

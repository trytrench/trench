import { TSchema } from "../data-types";

export type FeatureDef = {
  id: string;
  name: string;
  description?: string;
  schema: TSchema;
  entityTypeId: string;
};

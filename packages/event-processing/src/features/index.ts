import { z } from "zod";
import { TSchema, tSchemaZod } from "../data-types";

export const featureDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  schema: tSchemaZod,
  entityTypeId: z.string(),
});

export type FeatureDef = z.infer<typeof featureDefSchema>;

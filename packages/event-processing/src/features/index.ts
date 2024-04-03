import { z } from "zod";
import { TSchema, tSchemaZod } from "../data-types";

const metadataSchema = z.object({
  labels: z
    .array(
      z.object({
        name: z.string(),
        color: z.string(),
      })
    )
    .optional(),
});

export const featureDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  schema: tSchemaZod,
  entityTypeId: z.string().optional(),
  eventTypeId: z.string().optional(),
  metadata: metadataSchema.optional(),
});

export type FeatureDef = z.infer<typeof featureDefSchema>;

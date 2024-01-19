import { z } from "zod";
import { TSchema, tSchemaZod } from "../data-types";

export const dataPathZodSchema = z.object({
  nodeId: z.string(),
  path: z.array(z.string()),
  schema: tSchemaZod,
});

export type DataPath = z.infer<typeof dataPathZodSchema>;

import { z } from "zod";
import { tSchemaZod } from "../../data-types";

export const countArgsSchema = z.array(
  z.object({
    argName: z.string(),
    schema: tSchemaZod,
  })
);

export type CountArgs = z.infer<typeof countArgsSchema>;

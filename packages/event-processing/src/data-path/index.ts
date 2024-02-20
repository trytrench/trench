import { z } from "zod";
import { TSchema } from "../data-types";

export const dataPathZodSchema = z.object({
  nodeId: z.string(), // Node id
  path: z.array(z.string()), // Array of field strings, assuming [nodeId] refers to an object
});

export type DataPath = z.infer<typeof dataPathZodSchema>;

export const DataPathUtils = {
  equals: (a?: DataPath, b?: DataPath) => {
    return (
      a?.nodeId === b?.nodeId &&
      a?.path.length === b?.path.length &&
      a?.path.every((v, i) => v === b?.path[i])
    );
  },
};

export type DataPathInfoGetter = (dataPath: DataPath) => {
  schema: TSchema | null;
};

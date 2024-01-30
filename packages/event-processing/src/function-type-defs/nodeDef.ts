import { z } from "zod";
import { FnDef, fnDefSchema } from "./functionTypeDef";
import { TSchema, tSchemaZod } from "../data-types";
import { FnType } from "./types/_enum";
import { FnTypeDefsMap } from ".";

export const bareNodeDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  eventType: z.string(),
  inputs: z.record(z.any()),
  dependsOn: z.set(z.string()),
});

export const nodeDefSchema = bareNodeDefSchema.merge(
  z.object({
    fn: fnDefSchema,
  })
);

export interface NodeDef<T extends FnType = FnType> {
  id: string;
  name: string;
  eventType: string;
  inputs: FnTypeDefsMap[T]["inputSchema"]["_input"];
  dependsOn: Set<string>;
  fn: FnDef<T>;
}

// // Build node def

type Arg<T extends FnType> = Omit<NodeDef<T>, "dependsOn">;

export function buildNodeDefWithFn<T extends FnType>(
  type: T,
  args: Arg<T>
): Arg<T> {
  return args;
}

export function hasFnType<T extends FnType>(
  nodeDef: NodeDef,
  fnType: T
): nodeDef is NodeDef<T> {
  if (!fnType) return true;
  return nodeDef.fn.type === fnType;
}

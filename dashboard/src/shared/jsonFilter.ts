import { z } from "zod";

export enum JsonFilterOp {
  Equal = "equals",
  NotEqual = "not",
  GreaterThanOrEqual = "gte",
  LessThanOrEqual = "lte",
}

export const JSON_FILTER_OPS: { label: string; value: JsonFilterOp }[] = [
  { label: "==", value: JsonFilterOp.Equal },
  { label: "!=", value: JsonFilterOp.NotEqual },
  { label: ">=", value: JsonFilterOp.GreaterThanOrEqual },
  { label: "<=", value: JsonFilterOp.LessThanOrEqual },
];

export const jsonFilterZod = z.object({
  path: z.string(),
  op: z.nativeEnum(JsonFilterOp),
  value: z.string(),
});

export type JsonFilter = z.infer<typeof jsonFilterZod>;

export function parseValue(value: string): string | number | boolean {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  if (value.match(/^-?\d+$/)) {
    return parseInt(value);
  }
  if (value.match(/^-?\d+\.\d+$/)) {
    return parseFloat(value);
  }
  return value;
}

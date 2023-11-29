// TODO: distinguish btwn label and value, to support fuzzy search

import { JsonFilterOp } from "~/shared/jsonFilter";

export type ParamSchema = {
  type?: string; // default to type of left side
  count: number | "many";
};

// lists operators available for each data type,
// and specifies the type and amount of the arguments.
type AvailableOps = {
  [key in JsonFilterOp]: ParamSchema;
};

const commonOps = {
  [JsonFilterOp.Equal]: { count: 1 },
  [JsonFilterOp.NotEqual]: { count: 1 },
  [JsonFilterOp.NotEmpty]: { type: "none", count: 0 },
  [JsonFilterOp.IsEmpty]: { type: "none", count: 0 },
  // in
} as AvailableOps;

const comparisonOps = {
  [JsonFilterOp.GreaterThan]: { count: 1 },
  [JsonFilterOp.LessThan]: { count: 1 },
  [JsonFilterOp.GreaterThanOrEqual]: { count: 1 },
  [JsonFilterOp.LessThanOrEqual]: { count: 1 },
};

//

const textOps = {
  ...commonOps,
  [JsonFilterOp.Contains]: { count: 1 },
  [JsonFilterOp.DoesNotContain]: { count: 1 },
  [JsonFilterOp.StartsWith]: { count: 1 },
  [JsonFilterOp.EndsWith]: { count: 1 },
} as AvailableOps;

const numberOps = {
  ...commonOps,
  ...comparisonOps,
} as AvailableOps;

const dateOps = {
  ...commonOps,
  ...comparisonOps,
} as AvailableOps;

const booleanOps = {
  ...commonOps,
} as AvailableOps;

const noneOps = {
  [JsonFilterOp.NotEmpty]: { type: "none", count: 0 },
  [JsonFilterOp.IsEmpty]: { type: "none", count: 0 },
} as AvailableOps;

export const opsByDataType = {
  text: textOps,
  number: numberOps,
  date: dateOps,
  boolean: booleanOps,
  none: noneOps,
} as Record<string, AvailableOps>;

//

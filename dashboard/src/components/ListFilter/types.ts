// TODO: distinguish btwn label and value, to support fuzzy search

type ValueType = "text" | "number" | "date" | "boolean" | "none";
type RightValueType = {
  type: ValueType;
  count: number | "many";
};

type textOp =
  | "contains"
  | "does not contain"
  | "=="
  | "!="
  | "starts with"
  | "ends with"
  | "exists"
  | "in";
type numberOp = "==" | "!=" | ">" | "<" | ">=" | "<=" | "exists" | "in";
type dateOp = "before" | "before or on" | "after" | "after or on" | "exists";
type booleanOp = "is false" | "is true" | "exists";
type noneOp = "exists";

const textOps: Record<textOp, RightValueType> = {
  contains: { type: "text", count: 1 },
  "does not contain": { type: "text", count: 1 },
  "==": { type: "text", count: 1 },
  "!=": { type: "text", count: 1 },
  "starts with": { type: "text", count: 1 },
  "ends with": { type: "text", count: 1 },
  exists: { type: "none", count: 0 },
  in: { type: "text", count: "many" },
};

const numberOps: Record<numberOp, RightValueType> = {
  "==": { type: "number", count: 1 },
  "!=": { type: "number", count: 1 },
  ">": { type: "number", count: 1 },
  "<": { type: "number", count: 1 },
  ">=": { type: "number", count: 1 },
  "<=": { type: "number", count: 1 },
  exists: { type: "none", count: 0 },
  in: { type: "number", count: "many" },
};

const dateOps: Record<dateOp, RightValueType> = {
  before: { type: "date", count: 1 },
  "before or on": { type: "date", count: 1 },
  after: { type: "date", count: 1 },
  "after or on": { type: "date", count: 1 },
  exists: { type: "none", count: 0 },
};

const booleanOps: Record<booleanOp, RightValueType> = {
  "is false": { type: "none", count: 0 },
  "is true": { type: "none", count: 0 },
  exists: { type: "none", count: 0 },
};

const noneOps: Record<noneOp, RightValueType> = {
  exists: { type: "none", count: 0 },
};

export const opsByDataType = {
  text: textOps,
  number: numberOps,
  date: dateOps,
  boolean: booleanOps,
  none: noneOps,
};

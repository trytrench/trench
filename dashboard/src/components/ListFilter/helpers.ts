// TODO: distinguish btwn label and value, to support fuzzy search

type ValueType = "text" | "number" | "date" | "none";

export const opsByDataType: Record<string, Record<string, ValueType>> = {
  text: {
    contains: "text",
    "does not contain": "text",
    "==": "text",
    "!=": "text",
    "starts with": "text",
    "ends with": "text",
    exists: "none",
  },
  number: {
    "==": "number",
    "!=": "number",
    ">": "number",
    "<": "number",
    ">=": "number",
    "<=": "number",
    exists: "none",
  },
  date: {
    "==": "date",
    "!=": "date",
    ">": "date",
    "<": "date",
    ">=": "date",
    "<=": "date",
    exists: "none",
  },
  none: {
    exists: "none",
  },
};

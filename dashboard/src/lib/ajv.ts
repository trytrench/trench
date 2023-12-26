type StringSchema = {
  type: "string";
};

type BooleanSchema = {
  type: "boolean";
};

type ObjectSchema = {
  type: "object";
  properties: Record<string, Schema>;
};

type Schema = StringSchema | BooleanSchema | ObjectSchema;

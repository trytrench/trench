// Enums and Interfaces for DataType and Schemas
export enum TypeName {
  Boolean = "Boolean",
  Entity = "Entity",
  Float64 = "Float64",
  Int64 = "Int64",
  String = "String",
  Location = "Location",
  Object = "Object",
  Array = "Array",
}

interface TSchema {
  type: TypeName;
}

// Schema Handlers Interface and Implementations
abstract class SchemaHandler<T, TS extends TSchema> {
  constructor(protected schema: TS) {}
  abstract parse(input: any): T;
}

interface TBooleanSchema extends TSchema {
  type: TypeName.Boolean;
}

class BooleanSchemaHandler extends SchemaHandler<boolean, TBooleanSchema> {
  parse(input: any): boolean {
    if (typeof input !== "boolean")
      throw new Error("Invalid input for boolean type");
    return input;
  }
}

interface TFloat64Schema extends TSchema {
  type: TypeName.Float64;
}
class Float64SchemaHandler extends SchemaHandler<number, TFloat64Schema> {
  parse(input: any): number {
    if (typeof input !== "number")
      throw new Error("Invalid input for float64 type");
    return input;
  }
}

interface TInt64Schema extends TSchema {
  type: TypeName.Int64;
}
class Int64SchemaHandler extends SchemaHandler<number, TInt64Schema> {
  parse(input: any): number {
    if (typeof input !== "number")
      throw new Error("Invalid input for int64 type");
    return input;
  }
}

interface TStringSchema extends TSchema {
  type: TypeName.String;
}
class StringSchemaHandler extends SchemaHandler<string, TStringSchema> {
  parse(input: any): string {
    if (typeof input !== "string")
      throw new Error("Invalid input for string type");
    return input;
  }
}

interface TArraySchema<TItems extends TSchema = TSchema> extends TSchema {
  type: TypeName.Array;
  items: TItems;
}

class ArraySchemaHandler<T> extends SchemaHandler<T[], TArraySchema> {
  parse(input: any): T[] {
    if (!Array.isArray(input)) throw new Error("Invalid input for array type");
    const itemHandler = createSchemaHandler(this.schema.items);
    return input.map((item) => itemHandler.parse(item)) as T[];
  }
}

interface TObjectSchema<TProps extends Record<string, TSchema>>
  extends TSchema {
  type: TypeName.Object;
  properties: TProps;
}

class ObjectSchemaHandler<
  TProps extends Record<string, TSchema>,
> extends SchemaHandler<Record<string, any>, TObjectSchema<TProps>> {
  parse(input: any): Record<string, any> {
    const result: Record<string, any> = {};
    for (const key in this.schema.properties) {
      const handler = createSchemaHandler(this.schema.properties[key]!);
      result[key] = handler.parse(input[key]);
    }
    return result;
  }
}

interface TLocationSchema extends TSchema {
  type: TypeName.Location;
}
class LocationSchemaHandler extends SchemaHandler<
  { lat: number; lng: number },
  TLocationSchema
> {
  parse(input: any): { lat: number; lng: number } {
    if (
      typeof input !== "object" ||
      input === null ||
      !("lat" in input) ||
      !("lng" in input)
    ) {
      throw new Error("Invalid input for location type");
    }
    return { lat: input.lat, lng: input.lng };
  }
}

interface TEntitySchema<T extends string = string> extends TSchema {
  type: TypeName.Entity;
  entityType?: T;
}

class EntitySchemaHandler<T extends string = string> extends SchemaHandler<
  { type: T; id: string },
  TEntitySchema<T>
> {
  parse(input: any): { type: T; id: string } {
    if (typeof input !== "object" || input === null || !("id" in input)) {
      throw new Error("Invalid input for entity type");
    }
    if (this.schema.type && input.type !== this.schema.type) {
      throw new Error("Invalid entity type");
    }
    return input;
  }
}

// Type Registry and Factory Function
const schemaHandlerRegistry = {
  [TypeName.String]: StringSchemaHandler,
  [TypeName.Array]: ArraySchemaHandler,
  [TypeName.Object]: ObjectSchemaHandler,
  [TypeName.Location]: LocationSchemaHandler,
  [TypeName.Entity]: EntitySchemaHandler,
  [TypeName.Float64]: Float64SchemaHandler,
  [TypeName.Int64]: Int64SchemaHandler,
  [TypeName.Boolean]: BooleanSchemaHandler,
} satisfies {
  [K in TypeName]: new (schema: any) => SchemaHandler<any, TSchema>;
};
const normalizedRegistry: {
  [K in TypeName]: new (schema: any) => SchemaHandler<any, TSchema>;
} = schemaHandlerRegistry;

type SchemaTypeMap = {
  [K in TypeName]: (typeof schemaHandlerRegistry)[K];
};
type InferRuntimeType<TSchema> = TSchema extends { type: infer TType }
  ? TType extends keyof SchemaTypeMap
    ? InstanceType<SchemaTypeMap[TType]>["parse"] extends (
        input: any
      ) => infer TReturn
      ? TReturn
      : never
    : never
  : never;

function createSchemaHandler<T, TSchemaType extends TSchema>(
  schema: TSchemaType
): SchemaHandler<T, TSchemaType> {
  const HandlerClass = normalizedRegistry[schema.type];
  if (!HandlerClass)
    throw new Error(`Handler not found for type: ${schema.type}`);
  return new HandlerClass(schema) as SchemaHandler<T, TSchemaType>;
}

// Updated `buildDataType` Function
type DataTypeSchema<TName extends TypeName> = TName extends TypeName.Array
  ? TArraySchema<any> // Specify array item schema type
  : TSchema; // Use more specific schema types as necessary

export function buildDataType<TName extends TypeName>(
  schema: DataTypeSchema<TName>
): SchemaHandler<any, DataTypeSchema<TName>> {
  return createSchemaHandler<any, DataTypeSchema<TName>>(schema);
}

// Usage Example
const stringSchema = { type: TypeName.String };
const stringHandler = buildDataType<TypeName.String>(stringSchema);

const parsedData = stringHandler.parse("Hello, World!");
console.log(parsedData); // Outputs: "Hello, World!"

const testHandler = new ArraySchemaHandler({
  type: TypeName.Array,
  items: { type: TypeName.String },
});

const schema = {
  type: TypeName.Array,
  items: { type: TypeName.String },
} as const;

type TestSchema = InferRuntimeType<typeof schema>;

const ligma = testHandler.parse(["Hello", "World"]); // Outputs: ["Hello", "World"]

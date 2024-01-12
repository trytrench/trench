import { type } from "os";

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
  Any = "Any",
}

export type Entity = {
  type: string;
  id: string;
};

interface TSchemaBase {
  type: TypeName;
}

interface TBooleanSchema extends TSchemaBase {
  type: TypeName.Boolean;
}

interface TFloat64Schema extends TSchemaBase {
  type: TypeName.Float64;
}

interface TInt64Schema extends TSchemaBase {
  type: TypeName.Int64;
}

interface TStringSchema extends TSchemaBase {
  type: TypeName.String;
}

interface TLocationSchema extends TSchemaBase {
  type: TypeName.Location;
}

interface TEntitySchema<T extends string = string> extends TSchemaBase {
  type: TypeName.Entity;
  entityType?: T;
}

interface TArraySchema<TItems extends TSchema = TSchema> extends TSchemaBase {
  type: TypeName.Array;
  items: TItems;
}

interface TObjectSchema<
  TProps extends Record<string, TSchema> = Record<string, TSchema>,
> extends TSchemaBase {
  type: TypeName.Object;
  properties: TProps;
}

interface TAnySchema extends TSchemaBase {
  type: TypeName.Any;
}

type SchemaTypeMap = {
  [TypeName.Boolean]: boolean;
  [TypeName.Float64]: number;
  [TypeName.Int64]: number;
  [TypeName.String]: string;
  [TypeName.Location]: { lat: number; lng: number };
  [TypeName.Entity]: Entity;
  [TypeName.Array]: any[]; // Placeholder, will be refined later
  [TypeName.Object]: Record<string, any>; // Placeholder, will be refined later
  [TypeName.Any]: any; // Placeholder, will be refined later
};

export type InferSchemaType<T extends TSchema> = T extends TArraySchema<infer U>
  ? Array<InferSchemaType<U>>
  : T extends TObjectSchema<infer U>
  ? { [K in keyof U]: InferSchemaType<U[K]> }
  : T["type"] extends keyof SchemaTypeMap
  ? SchemaTypeMap[T["type"]]
  : never;

function throwParseError(type: TypeName, input: any): never {
  throw new Error(`Invalid input for ${type} type: ${JSON.stringify(input)}`);
}

// Base class for data types
abstract class IDataType<TS extends TSchema> {
  constructor(public schema: TS) {}
  abstract parse(input: any): InferSchemaType<TS>;
  abstract toTypescript(): string;
  throwParseError(input: any): never {
    throwParseError(this.schema.type, input);
  }
  isSubTypeOf<T extends TSchema>(schema: T): boolean {
    return schema.type === this.schema.type;
  }
}

// Implementations for each data type
class StringDataType extends IDataType<TStringSchema> {
  parse(input: any) {
    if (typeof input !== "string")
      throw new Error("Invalid input for string type");
    return input;
  }
  toTypescript(): string {
    return "string";
  }
}

class BooleanDataType extends IDataType<TBooleanSchema> {
  parse(input: any): boolean {
    if (typeof input !== "boolean") this.throwParseError(input);
    return input;
  }
  toTypescript(): string {
    return "boolean";
  }
}

class Float64DataType extends IDataType<TFloat64Schema> {
  parse(input: any): number {
    if (typeof input !== "number") this.throwParseError(input);
    return input;
  }
  toTypescript(): string {
    return "number";
  }
}

class Int64DataType extends IDataType<TInt64Schema> {
  parse(input: any): number {
    if (typeof input !== "number") this.throwParseError(input);
    return input;
  }
  toTypescript(): string {
    return "number";
  }
}

class LocationDataType extends IDataType<TLocationSchema> {
  parse(input: any): { lat: number; lng: number } {
    if (typeof input !== "object") this.throwParseError(input);
    if (!("lat" in input) || typeof input.lat !== "number")
      this.throwParseError(input);
    if (!("lng" in input) || typeof input.lng !== "number")
      this.throwParseError(input);

    return { lat: input.lat, lng: input.lng };
  }
  toTypescript(): string {
    return "{ lat: number; lng: number }";
  }
}

class EntityDataType<T extends string = string> extends IDataType<
  TEntitySchema<T>
> {
  parse(input: any): Entity {
    if (typeof input !== "object") {
      this.throwParseError(input);
    }
    if (!("id" in input) || typeof input.id !== "string") {
      this.throwParseError(input);
    }
    return input;
  }
  toTypescript(): string {
    // Handle entity type
    if (this.schema.entityType) {
      const entityType = this.schema.entityType.replace(/"/g, '\\"');
      return `{ type: "${entityType}"; id: string }`;
    } else {
      return `{ type: string; id: string }`;
    }
  }
  isSubTypeOf<T extends TSchema>(schema: T): boolean {
    if (schema.type !== TypeName.Entity) return false;
    if (this.schema.entityType && schema.entityType) {
      return this.schema.entityType === schema.entityType;
    }
    return true;
  }
}

class ArrayDataType<TItems extends TSchema> extends IDataType<
  TArraySchema<TItems>
> {
  parse(input: any): InferSchemaType<TArraySchema<TItems>> {
    if (!Array.isArray(input)) this.throwParseError(input);
    return input.map((item) => createDataType(this.schema.items).parse(item));
  }
  toTypescript(): string {
    return `Array<${createDataType(this.schema.items).toTypescript()}>`;
  }
}

class ObjectDataType<TProps extends Record<string, TSchema>> extends IDataType<
  TObjectSchema<TProps>
> {
  parse(input: any) {
    const result: Record<string, any> = {};
    if (typeof input !== "object") this.throwParseError(input);
    for (const key in this.schema.properties) {
      result[key] = createDataType(this.schema.properties[key]!).parse(
        input[key]
      );
    }
    return result as InferSchemaType<TObjectSchema<TProps>>;
  }
  toTypescript(): string {
    const result = [];
    for (const key in this.schema.properties) {
      result.push(
        `${key}: ${createDataType(this.schema.properties[key]!).toTypescript()}`
      );
    }
    return `{ ${result.join("; ")} }`;
  }
}

class AnyDataType extends IDataType<TAnySchema> {
  parse(input: any): any {
    return input;
  }
  toTypescript(): string {
    return "any";
  }
  isSubTypeOf<T extends TSchema>(schema: T): boolean {
    return true;
  }
}

type RegistryConfig = {
  [K in TypeName]: {
    type: new (schema: any) => IDataType<any>;
    defaultSchema: Extract<TSchema, { type: K }>;
  };
};

// Registry and Factory Function
export const DATA_TYPES_REGISTRY = {
  [TypeName.String]: {
    type: StringDataType,
    defaultSchema: { type: TypeName.String },
  },
  [TypeName.Boolean]: {
    type: BooleanDataType,
    defaultSchema: { type: TypeName.Boolean },
  },
  [TypeName.Float64]: {
    type: Float64DataType,
    defaultSchema: { type: TypeName.Float64 },
  },
  [TypeName.Int64]: {
    type: Int64DataType,
    defaultSchema: { type: TypeName.Int64 },
  },
  [TypeName.Location]: {
    type: LocationDataType,
    defaultSchema: { type: TypeName.Location },
  },
  [TypeName.Entity]: {
    type: EntityDataType,
    defaultSchema: { type: TypeName.Entity },
  },
  [TypeName.Array]: {
    type: ArrayDataType,
    defaultSchema: { type: TypeName.Array, items: { type: TypeName.Any } },
  },
  [TypeName.Object]: {
    type: ObjectDataType,
    defaultSchema: { type: TypeName.Object, properties: {} },
  },
  [TypeName.Any]: {
    type: AnyDataType,
    defaultSchema: { type: TypeName.Any },
  },
} satisfies RegistryConfig;

type DataTypesConstructorMap = typeof DATA_TYPES_REGISTRY;
type DataTypesMap = {
  [K in TypeName]: InstanceType<DataTypesConstructorMap[K]["type"]>;
};

export type TSchema =
  | TStringSchema
  | TBooleanSchema
  | TFloat64Schema
  | TInt64Schema
  | TLocationSchema
  | TEntitySchema
  | TArraySchema
  | TObjectSchema
  | TAnySchema;

export function createDataType<T extends TSchema>(schema: T): IDataType<T> {
  const registry: RegistryConfig = DATA_TYPES_REGISTRY;
  const DataType = registry[schema.type]?.type;
  if (!DataType)
    throw new Error(`No data type registered for type: ${schema.type}`);
  return new DataType(schema) as IDataType<T>;
}

export function resolveSchemaType<T extends TSchema>(
  schema: T
): InferSchemaType<T> {
  return createDataType(schema).parse(schema);
}

export function getNamedTS(schema: TSchema, name = "Type"): string {
  return `type ${name} = ${createDataType(schema).toTypescript()}`;
}

export type TypedData<T extends TSchema = TSchema> = {
  schema: T;
  value: InferSchemaType<T>;
};

export function getTypedData<T extends TSchema = TSchema>(
  data: any,
  schema: T
): TypedData<T> {
  return {
    schema,
    value: createDataType(schema).parse(data),
  };
}

import { z } from "zod";

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
  Date = "Date",
  Rule = "Rule",
  Tuple = "Tuple",
  Name = "Name",
  Union = "Union",
  Undefined = "Undefined",
  Null = "Null",
  URL = "URL",
}

export type Entity = {
  type: string;
  id: string;
};

interface TSchemaBase {
  type: TypeName;
}

export interface TBooleanSchema extends TSchemaBase {
  type: TypeName.Boolean;
}

export interface TFloat64Schema extends TSchemaBase {
  type: TypeName.Float64;
}

export interface TInt64Schema extends TSchemaBase {
  type: TypeName.Int64;
}

export interface TStringSchema extends TSchemaBase {
  type: TypeName.String;
}

export interface TLocationSchema extends TSchemaBase {
  type: TypeName.Location;
}

export interface TEntitySchema<T extends string = string> extends TSchemaBase {
  type: TypeName.Entity;
  entityType?: T;
}

export interface TArraySchema<TItems extends TSchema = TSchema>
  extends TSchemaBase {
  type: TypeName.Array;
  items: TItems;
}

export interface TObjectSchema<
  TProps extends Record<string, TSchema> = Record<string, TSchema>,
> extends TSchemaBase {
  type: TypeName.Object;
  properties: TProps;
}

export interface TAnySchema extends TSchemaBase {
  type: TypeName.Any;
}

export interface TDateSchema extends TSchemaBase {
  type: TypeName.Date;
}

export interface TRuleSchema extends TSchemaBase {
  type: TypeName.Rule;
}

export interface TTupleSchema<T extends TSchema[] = TSchema[]>
  extends TSchemaBase {
  type: TypeName.Tuple;
  items: {
    [K in keyof T]: T[K];
  };
}

export interface TNameSchema extends TSchemaBase {
  type: TypeName.Name;
}

export interface TUnionSchema<T extends TSchema[] = TSchema[]>
  extends TSchemaBase {
  type: TypeName.Union;
  unionTypes: T;
}

export interface TUndefinedSchema extends TSchemaBase {
  type: TypeName.Undefined;
}

export interface TNullSchema extends TSchemaBase {
  type: TypeName.Null;
}

export interface TURLSchema extends TSchemaBase {
  type: TypeName.URL;
}

interface SchemaTypeMap {
  [TypeName.Boolean]: boolean;
  [TypeName.Float64]: number;
  [TypeName.Int64]: number;
  [TypeName.String]: string;
  [TypeName.Location]: { lat: number; lng: number };
  [TypeName.Entity]: Entity;
  [TypeName.Array]: any[]; // Placeholder, will be refined later
  [TypeName.Object]: Record<string, any>; // Placeholder, will be refined later
  [TypeName.Any]: any; // Placeholder, will be refined later
  [TypeName.Date]: Date;
  [TypeName.Rule]: boolean;
  [TypeName.Tuple]: any[]; // Placeholder, will be refined later
  [TypeName.Name]: string;
  [TypeName.Union]: any;
  [TypeName.Undefined]: undefined;
  [TypeName.Null]: null;
  [TypeName.URL]: string;
}

type InferTupleItemType<T> = T extends TSchema ? InferSchemaType<T> : never;

export type InferSchemaType<T extends TSchema> = T extends TArraySchema<infer U>
  ? Array<InferSchemaType<U>>
  : T extends TObjectSchema<infer U>
  ? { [K in keyof U]: InferSchemaType<U[K]> }
  : // : T extends TTupleSchema<infer U>
  // ? { [K in keyof U]: InferTupleItemType<U[K]> }
  T["type"] extends keyof SchemaTypeMap
  ? SchemaTypeMap[T["type"]]
  : never;

function throwParseError(type: TypeName, input: any): never {
  throw new Error(`Invalid input for type ${type}: ${JSON.stringify(input)}`);
}

// Base class for data types
abstract class IDataType<TS extends TSchema> {
  constructor(public schema: TS) {}
  abstract parse(input: any): InferSchemaType<TS>;
  abstract toTypescript(): string;
  throwParseError(input: any): never {
    throwParseError(this.schema.type, input);
  }
  isSuperTypeOf<T extends TSchema>(schema: T): boolean {
    return schema.type === this.schema.type;
  }

  /**
   * Can the argument schema be assigned to this type?
   *
   * Sometimes a super type can be assigned to a sub type, for example:
   *  - `string` can be assigned to `name`
   *  - `int64` can be assigned to `float64`
   */
  canBeAssigned<T extends TSchema>(schema: T): boolean {
    return this.isSuperTypeOf(schema);
  }

  equals<T extends TSchema>(schema: T): boolean {
    const otherType = createDataType(schema);
    return this.isSuperTypeOf(schema) && otherType.isSuperTypeOf(this.schema);
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
  isSuperTypeOf<T extends TSchema>(schema: T): boolean {
    return schema.type === TypeName.String || schema.type === TypeName.Name;
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
  isSuperTypeOf<T extends TSchema>(schema: T): boolean {
    if (schema.type === TypeName.Float64) return true;
    if (schema.type === TypeName.Int64) return true;
    return false;
  }
  canBeAssigned<T extends TSchema>(schema: T): boolean {
    if (schema.type === TypeName.Int64) return true;
    return super.canBeAssigned(schema);
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
  isSuperTypeOf<T extends TSchema>(schema: T): boolean {
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
        `"${key}": ${createDataType(
          this.schema.properties[key]!
        ).toTypescript()}`
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
  isSuperTypeOf<T extends TSchema>(schema: T): boolean {
    return true;
  }
  canBeAssigned<T extends TSchema>(schema: T): boolean {
    return true;
  }
}

class DateDataType extends IDataType<TDateSchema> {
  parse(input: any): Date {
    if (typeof input !== "string") this.throwParseError(input);
    const date = new Date(input);
    if (input !== date.toISOString()) this.throwParseError(input);
    return date;
  }
  toTypescript(): string {
    return "string";
  }
}

class RuleDataType extends IDataType<TRuleSchema> {
  parse(input: any): boolean {
    if (typeof input !== "boolean") this.throwParseError(input);
    return input;
  }
  toTypescript(): string {
    return "boolean";
  }
}

class TupleDataType<TItems extends TSchema[]> extends IDataType<
  TTupleSchema<TItems>
> {
  parse(input: any): InferSchemaType<TTupleSchema<TItems>> {
    if (!Array.isArray(input)) this.throwParseError(input);
    if (input.length !== this.schema.items.length) this.throwParseError(input);

    return this.schema.items.map((itemSchema, index) =>
      (createDataType(itemSchema) as IDataType<any>).parse(input[index])
    ) as InferSchemaType<TTupleSchema<TItems>>;
  }

  toTypescript(): string {
    return `[${this.schema.items
      .map((item) => createDataType(item).toTypescript())
      .join(", ")}]`;
  }
}

class NameDataType extends IDataType<TNameSchema> {
  parse(input: any): string {
    if (typeof input !== "string") this.throwParseError(input);
    return input;
  }
  toTypescript(): string {
    return "string";
  }
  canBeAssigned<T extends TSchema>(schema: T): boolean {
    if (schema.type === TypeName.String) return true;
    return super.canBeAssigned(schema);
  }
}

class UnionDataType extends IDataType<TUnionSchema> {
  parse(input: any): any {
    for (const schema of this.schema.unionTypes) {
      try {
        return createDataType(schema).parse(input);
      } catch {}
    }
    throw new Error(`Invalid input for union type: ${JSON.stringify(input)}`);
  }
  toTypescript(): string {
    return this.schema.unionTypes
      .map((schema) => createDataType(schema).toTypescript())
      .join(" | ");
  }
  isSuperTypeOf<T extends TSchema>(schema: T): boolean {
    return this.schema.unionTypes.some((s) =>
      createDataType(s).isSuperTypeOf(schema)
    );
  }
}

class UndefinedDataType extends IDataType<TUndefinedSchema> {
  parse(input: any): undefined {
    if (typeof input !== "undefined") this.throwParseError(input);
    return input;
  }
  toTypescript(): string {
    return "undefined";
  }
}

class NullDataType extends IDataType<TNullSchema> {
  parse(input: any): null {
    if (input !== null) this.throwParseError(input);
    return input;
  }
  toTypescript(): string {
    return "null";
  }
}

class URLDataType
  extends IDataType<TURLSchema>
  implements IDataType<TURLSchema>
{
  parse(input: any): string {
    if (typeof input !== "string") this.throwParseError(input);
    return input;
  }

  toTypescript(): string {
    return "string";
  }

  canBeAssigned<T extends TSchema>(schema: T): boolean {
    if (schema.type === TypeName.String) return true;
    return super.canBeAssigned(schema);
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
    defaultSchema: { type: TypeName.Entity, entityType: undefined },
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
  [TypeName.Date]: {
    type: DateDataType,
    defaultSchema: { type: TypeName.Date },
  },
  [TypeName.Rule]: {
    type: RuleDataType,
    defaultSchema: { type: TypeName.Rule },
  },
  [TypeName.Tuple]: {
    type: TupleDataType,
    defaultSchema: { type: TypeName.Tuple, items: [] },
  },
  [TypeName.Name]: {
    type: NameDataType,
    defaultSchema: { type: TypeName.Name },
  },
  [TypeName.Union]: {
    type: UnionDataType,
    defaultSchema: { type: TypeName.Union, unionTypes: [] },
  },
  [TypeName.Undefined]: {
    type: UndefinedDataType,
    defaultSchema: { type: TypeName.Undefined },
  },
  [TypeName.Null]: {
    type: NullDataType,
    defaultSchema: { type: TypeName.Null },
  },
  [TypeName.URL]: {
    type: URLDataType,
    defaultSchema: { type: TypeName.URL },
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
  | TAnySchema
  | TDateSchema
  | TRuleSchema
  | TTupleSchema
  | TNameSchema
  | TUnionSchema
  | TUndefinedSchema
  | TNullSchema
  | TURLSchema;

export const tSchemaZod = z.custom<TSchema>((input) => {
  if (!input) return false;
  if (typeof input !== "object") return false;
  if (!("type" in input)) return false;
  if (typeof input.type !== "string") return false;
  if (!(input.type in TypeName)) return false;
  return true;
});

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

export function parseTypedData<T extends TSchema>(
  expectedSchema: T,
  data: TypedData
): InferSchemaType<T> {
  return createDataType(expectedSchema).parse(data.value);
}

function isEqual(...args: TSchema[]) {
  const first = JSON.stringify(args[0]);
  for (const arg of args) {
    if (JSON.stringify(arg) !== first) return false;
  }
}

export function inferSchemaFromJsonObject(jsonObj: any): TSchema {
  if (typeof jsonObj === "string") {
    try {
      const date = new Date(jsonObj);
      if (jsonObj === date.toISOString()) {
        return { type: TypeName.Date };
      }
    } catch {
      return { type: TypeName.String };
    }

    return { type: TypeName.String };
  } else if (typeof jsonObj === "boolean") {
    return { type: TypeName.Boolean };
  } else if (typeof jsonObj === "number") {
    return { type: TypeName.Float64 };
  } else if (Array.isArray(jsonObj)) {
    const items = jsonObj.map((item) => inferSchemaFromJsonObject(item));
    if (!isEqual(...items) || items.length === 0) {
      return { type: TypeName.Array, items: { type: TypeName.Any } };
    } else {
      return {
        type: TypeName.Array,
        items: inferSchemaFromJsonObject(jsonObj[0]),
      };
    }
  } else if (jsonObj === null) {
    return { type: TypeName.Null };
  } else if (typeof jsonObj === "undefined") {
    return { type: TypeName.Undefined };
  } else if (typeof jsonObj === "object") {
    const properties: Record<string, TSchema> = {};
    for (const key in jsonObj) {
      properties[key] = inferSchemaFromJsonObject(jsonObj[key]);
    }
    return {
      type: TypeName.Object,
      properties,
    };
  } else {
    throw new Error(`Cannot infer schema from JSON: ${jsonObj}`);
  }
}

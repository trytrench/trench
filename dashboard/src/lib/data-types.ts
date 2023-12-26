export enum DataTypeName {
  Boolean = "Boolean",
  Entity = "Entity",
  Float64 = "Float64",
  Int64 = "Int64",
  String = "String",
  Location = "Location",
  Object = "Object",
  Array = "Array",
}

type Param = IDataTypeAny | string | number | boolean | undefined;

type Params = {
  [key: string]: Params | Param;
};

function getSerializableParams(
  params: Params | undefined
): Record<string, any> | undefined {
  const result: Record<string, any> = {};
  if (!params) return undefined;
  for (const key in params) {
    const value = params[key];
    if (value instanceof IDataType) {
      result[key] = value.getSchema();
    } else if (typeof value === "object") {
      result[key] = getSerializableParams(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

type BaseSchema<
  TName extends DataTypeName = DataTypeName,
  TParams extends Params | undefined = any,
> = {
  type: TName;
  params?: TParams;
};

export abstract class IDataType<
  T,
  TName extends DataTypeName = DataTypeName,
  TParams extends Params | undefined = any,
  TSchema extends BaseSchema<TName, TParams> = BaseSchema<TName, TParams>,
> {
  abstract name: TName;
  abstract parse(input: any): T;

  getSchema(): TSchema {
    return {
      type: this.name,
      params: getSerializableParams(this.params),
    } as TSchema;
  }

  params: TParams;

  constructor(...args: TParams extends undefined ? [] : [TParams]) {
    this.params = args[0] as TParams;
  }
}

type IDataTypeAny = IDataType<any, any, any>;

export class StringDataType extends IDataType<
  string,
  DataTypeName.String,
  undefined
> {
  name = DataTypeName.String as const;

  parse(input: any): string {
    if (typeof input !== "string")
      throw new Error("Invalid input for string type");
    return input;
  }
}

export class ArrayDataType<T> extends IDataType<
  T[],
  DataTypeName.Array,
  { items: IDataType<T> }
> {
  name = DataTypeName.Array as const;

  parse(input: any): T[] {
    if (!Array.isArray(input)) throw new Error("Invalid input for array type");
    return input.map((item) => this.params.items.parse(item));
  }
}

export class ObjectDataType<
  T extends Record<string, IDataType<any>>,
> extends IDataType<
  { [K in keyof T]: T[K] extends IDataType<infer U> ? U : never },
  DataTypeName.Object,
  { properties: T }
> {
  name = DataTypeName.Object as const;

  parse(input: any): {
    [K in keyof T]: T[K] extends IDataType<infer U> ? U : never;
  } {
    const result: any = {};
    for (const key in this.params.properties) {
      result[key] = this.params.properties[key]!.parse(input[key]);
    }
    return result;
  }
}

export class EntityDataType<T extends string = string> extends IDataType<
  { type: T; id: string },
  DataTypeName.Entity,
  { type?: T }
> {
  name = DataTypeName.Entity as const;

  parse(input: any): { type: T; id: string } {
    if (typeof input !== "object" || input === null || !("id" in input))
      throw new Error("Invalid input for entity type");
    if (this.params.type && input.type !== this.params.type)
      throw new Error("Invalid entity type");
    return input;
  }
}

export class LocationDataType extends IDataType<
  { lat: number; lng: number },
  DataTypeName.Location,
  undefined
> {
  name = DataTypeName.Location as const;

  parse(input: any): { lat: number; lng: number } {
    if (
      typeof input !== "object" ||
      input === null ||
      !("lat" in input) ||
      !("lng" in input)
    )
      throw new Error("Invalid input for location type");
    return input;
  }
}

export class BooleanDataType extends IDataType<
  boolean,
  DataTypeName.Boolean,
  undefined
> {
  name = DataTypeName.Boolean as const;

  parse(input: any): boolean {
    if (typeof input !== "boolean")
      throw new Error("Invalid input for boolean type");
    return input;
  }
}

export class Int64DataType extends IDataType<
  number,
  DataTypeName.Int64,
  undefined
> {
  name = DataTypeName.Int64 as const;

  parse(input: any): number {
    if (typeof input !== "number")
      throw new Error("Invalid input for int64 type");
    return input;
  }
}

export class Float64DataType extends IDataType<
  number,
  DataTypeName.Float64,
  undefined
> {
  name = DataTypeName.Float64 as const;

  parse(input: any): number {
    if (typeof input !== "number")
      throw new Error("Invalid input for float64 type");
    return input;
  }
}

const Type = {
  [DataTypeName.String]: StringDataType,
  [DataTypeName.Array]: ArrayDataType,
  [DataTypeName.Object]: ObjectDataType,
  [DataTypeName.Entity]: EntityDataType,
  [DataTypeName.Location]: LocationDataType,
  [DataTypeName.Boolean]: BooleanDataType,
  [DataTypeName.Int64]: Int64DataType,
  [DataTypeName.Float64]: Float64DataType,
} satisfies {
  [K in DataTypeName]: new (...args: any) => IDataType<any, K>;
};

const DATA_TYPES_NORM: Record<
  DataTypeName,
  new (...args: any) => IDataType<any, DataTypeName>
> = Type;

type DataTypesMap = {
  [K in DataTypeName]: InstanceType<(typeof Type)[K]>;
};

new Type.String();

type ParamsRequired<TName extends DataTypeName> =
  undefined extends DataTypesMap[TName]["params"] ? false : true;

type DataTypeSchema<TName extends DataTypeName> =
  ParamsRequired<TName> extends true
    ? { type: TName; params: DataTypesMap[TName]["params"] }
    : { type: TName; params?: DataTypesMap[TName]["params"] };

type DataTypeSchemaMap = {
  [K in DataTypeName]: DataTypeSchema<K>;
};

// function buildDataType<
//   TName extends DataTypeName,
//   T extends DataTypeSchemaMap[TName],
// >(schema: T): DataTypesMap[TName] {
//   return new DATA_TYPES_NORM[schema.type](schema.params) as any;
// }

//  do better

export function buildDataType<TName extends DataTypeName>(
  schema: DataTypeSchema<TName>
): DataTypesMap[TName] {
  return "params" in schema
    ? (new DATA_TYPES_NORM[schema.type](schema.params) as any)
    : (new DATA_TYPES_NORM[schema.type]() as any);
}

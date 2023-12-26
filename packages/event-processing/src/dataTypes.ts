import { assert } from "common";

export enum DataType {
  Int64 = "Int64",
  Float64 = "Float64",
  String = "String",
  Boolean = "Boolean",
  Object = "Object",
  Entity = "Entity",
  Record = "Record",
  Array = "Array",
}

export type Entity = {
  type: string;
  id: string;
};

export type TrenchError = {
  message: string;
};

export interface DataTypeToTsType {
  [DataType.Int64]: number;
  [DataType.Float64]: number;
  [DataType.String]: string;
  [DataType.Boolean]: boolean;
  [DataType.Object]: object;
  [DataType.Entity]: Entity;
  [DataType.Record]: Record<string, TypedData>;
  [DataType.Array]: Array<TypedData>;
}

export type TypedDataMap = {
  [TDataType in DataType]: {
    type: TDataType;
    value: DataTypeToTsType[TDataType];
  };
};

export type TypedData<TDataType extends DataType = DataType> =
  TypedDataMap[TDataType];

export function validateTypedData(typedData: TypedDataMap[DataType]) {
  const { type, value } = typedData;
  switch (type) {
    case DataType.Int64:
    case DataType.Float64:
      assert(typeof value === "number", "Expected number");
      assert(!isNaN(value), "Expected number");
      break;
    case DataType.String:
      assert(typeof value === "string", "Expected string");
      break;
    case DataType.Boolean:
      assert(typeof value === "boolean", "Expected boolean");
      break;
    case DataType.Object:
      assert(typeof value === "object", "Expected object");
      break;
    case DataType.Entity:
      assert(typeof value === "object", "Expected object");
      assert(
        value.id && typeof value.id === "string",
        "DataType Entity must have an id of type string"
      );
      assert(
        value.type && typeof value.type === "string",
        "DataType Entity must have a type of type string"
      );
      break;
  }
}

export function encodeTypedData(data: TypedDataMap[DataType]) {
  const { type, value } = data;
  switch (type) {
    case DataType.Boolean:
      return value.toString();
    case DataType.Entity:
      return JSON.stringify({
        type: value.type,
        id: value.id,
      });
    case DataType.Float64:
    case DataType.Int64:
      return value.toString();
    case DataType.String:
      return value;
    default:
      throw new Error(`Cannot stringify unknown data type ${type}`);
  }
}

export function decodeTypedData(
  dataType: DataType,
  value: string
): TypedDataMap[DataType] {
  switch (dataType) {
    case DataType.Boolean:
      return {
        type: DataType.Boolean,
        value: value === "true",
      };
    case DataType.Entity: {
      const { type, id } = JSON.parse(value);
      return {
        type: DataType.Entity,
        value: {
          type,
          id,
        },
      };
    }
    case DataType.Float64:
      return {
        type: DataType.Float64,
        value: Number(value),
      };
    case DataType.Int64:
      return {
        type: DataType.Int64,
        value: Number(value),
      };
    case DataType.String:
      return {
        type: DataType.String,
        value,
      };
    default:
      throw new Error(`Cannot decode unknown data type ${dataType}`);
  }
}

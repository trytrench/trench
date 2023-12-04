import { assert } from "./utils";

export enum DataType {
  Int64 = "Int64",
  Float64 = "Float64",
  String = "String",
  Boolean = "Boolean",
  Object = "Object",
  Entity = "Entity",
}

export type Entity = {
  type: string;
  id: string;
};

export interface DataTypeToTsType {
  [DataType.Int64]: number;
  [DataType.Float64]: number;
  [DataType.String]: string;
  [DataType.Boolean]: boolean;
  [DataType.Object]: object;
  [DataType.Entity]: Entity;
}

export type TypedData = {
  [TDataType in DataType]: {
    type: TDataType;
    value: DataTypeToTsType[TDataType];
  };
};

export function validateTypedData(typedData: TypedData[DataType]) {
  const { type, value } = typedData;
  switch (type) {
    case DataType.Int64:
    case DataType.Float64:
      assert(typeof value === "number", "Expected number");
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
        "Entity must have an id of type string"
      );
      assert(
        value.type && typeof value.type === "string",
        "Entity must have a type of type string"
      );
      break;
  }
}

export function stringifyTypedData(data: TypedData[DataType]) {
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

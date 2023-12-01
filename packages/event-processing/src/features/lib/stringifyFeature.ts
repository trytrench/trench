import { DataType, DataTypeValue } from "../dataTypes";

export function stringifyFeatureValue(value: DataTypeValue) {
  switch (value.type) {
    case DataType.Boolean:
      return value.data.toString();
    case DataType.Entity:
      return `${value.data.type}:${value.data.id}`;
    case DataType.Float64:
    case DataType.Int64:
      return value.data.toString();
    case DataType.String:
      return value.data;
    default:
      throw new Error(`Unknown data type ${value.type}`);
  }
}

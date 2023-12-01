/**
 * features = [
    # id, type, entity ids
    (1, 'Int64'),
    (2, 'Float64', ['user']),
    (3, 'String'),
    (4, 'Bool'),
    (5, 'String', ['user']),
    (6, 'Bool', ['user']),
    (7, 'Int64', ['user']),
    (8, 'Float64', ['user']),
    (9, 'String', ['ip']),
    (10, 'Bool', ['ip']),
    (11, 'Int64', ['ip']),
    (12, 'Float64', ['ip']),
    (13, 'String', ['card']),
    (14, 'Bool', ['card']),
    (15, 'Int64', ['card']),
    (16, 'Float64', ['card']),
    (17, 'Int64', ['user', 'ip']),
    (18, 'Float64', ['user', 'ip']),
    (19, 'String', ['user', 'ip']),
    (20, 'Bool', ['user', 'ip'])
]
 */

enum DataType {
  Int64 = "Int64",
  Float64 = "Float64",
  String = "String",
  Bool = "Bool",
}

type FeatureConfig = {
  id: number;
  dataType: DataType;
};

export const FEATURE_CONFIGS: FeatureConfig[] = [
  { id: 1, dataType: DataType.Int64 },
  { id: 2, dataType: DataType.Float64 },
  { id: 3, dataType: DataType.String },
  { id: 4, dataType: DataType.Bool },
  { id: 5, dataType: DataType.String },
  { id: 6, dataType: DataType.Bool },
  { id: 7, dataType: DataType.Int64 },
  { id: 8, dataType: DataType.Float64 },
  { id: 9, dataType: DataType.String },
  { id: 10, dataType: DataType.Bool },
  { id: 11, dataType: DataType.Int64 },
  { id: 12, dataType: DataType.Float64 },
  { id: 13, dataType: DataType.String },
  { id: 14, dataType: DataType.Bool },
  { id: 15, dataType: DataType.Int64 },
  { id: 16, dataType: DataType.Float64 },
  { id: 17, dataType: DataType.Int64 },
  { id: 18, dataType: DataType.Float64 },
  { id: 19, dataType: DataType.String },
  { id: 20, dataType: DataType.Bool },
];

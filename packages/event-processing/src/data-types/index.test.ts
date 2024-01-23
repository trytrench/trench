import { TypeName, inferSchemaFromJsonObject } from ".";

describe("inferSchemaFromJsonObject Tests", () => {
  // String Tests
  test("should identify a simple string", () => {
    expect(inferSchemaFromJsonObject("hello")).toEqual({
      type: TypeName.String,
    });
  });

  test("should identify an ISO date string as a Date", () => {
    const isoDateString = new Date().toISOString();
    expect(inferSchemaFromJsonObject(isoDateString)).toEqual({
      type: TypeName.Date,
    });
  });

  test("should identify an invalid date string as a String", () => {
    expect(inferSchemaFromJsonObject("not-a-date")).toEqual({
      type: TypeName.String,
    });
  });

  // Boolean Test
  test("should identify a boolean", () => {
    expect(inferSchemaFromJsonObject(true)).toEqual({ type: TypeName.Boolean });
  });

  // Number Test
  test("should identify a number", () => {
    expect(inferSchemaFromJsonObject(123.45)).toEqual({
      type: TypeName.Float64,
    });
  });

  // Array Tests
  test("should handle an empty array", () => {
    expect(inferSchemaFromJsonObject([])).toEqual({
      type: TypeName.Array,
      items: { type: TypeName.Any },
    });
  });

  test("should handle arrays", () => {
    expect(inferSchemaFromJsonObject([1, 2, 3])).toEqual({
      type: TypeName.Array,
      items: { type: TypeName.Any },
    });
  });

  // Object Tests
  test("should handle a simple object", () => {
    const obj = { a: 1, b: "string", c: true };
    const expectedSchema = {
      type: TypeName.Object,
      properties: {
        a: { type: TypeName.Float64 },
        b: { type: TypeName.String },
        c: { type: TypeName.Boolean },
      },
    };
    expect(inferSchemaFromJsonObject(obj)).toEqual(expectedSchema);
  });

  test("should handle a nested object", () => {
    const obj = { a: 1, b: { c: "string", d: false } };
    const expectedSchema = {
      type: TypeName.Object,
      properties: {
        a: { type: TypeName.Float64 },
        b: {
          type: TypeName.Object,
          properties: {
            c: { type: TypeName.String },
            d: { type: TypeName.Boolean },
          },
        },
      },
    };
    expect(inferSchemaFromJsonObject(obj)).toEqual(expectedSchema);
  });

  test("should handle undefined", () => {
    expect(inferSchemaFromJsonObject(undefined)).toEqual({
      type: TypeName.Any,
    });
  });

  test("should handle null", () => {
    expect(inferSchemaFromJsonObject(null)).toEqual({
      type: TypeName.Any,
    });
  });
});

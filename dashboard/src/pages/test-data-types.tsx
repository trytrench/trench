"use client";
import { api } from "../utils/api";
import { TSchema, TypeName, createType, getNamedTS } from "../lib/attempt2";
import { useMemo, useState } from "react";
import { IndentationText, Project } from "ts-morph";

enum EntityType {
  Card = "card_type_id",
  Ip = "ip_type_id",
}

const ENTITY_TYPE_NAMES: Record<EntityType, string> = {
  [EntityType.Card]: "Card",
  [EntityType.Ip]: "Ip",
};

const cardEntity = createType({
  type: TypeName.Entity,
  entityType: EntityType.Card,
});

const location = createType({
  type: TypeName.Location,
});

interface Argument {
  name: string;
  type: TSchema;
}

interface Count {
  count: Argument[];
  countBy: Argument[];
  timeWindow: {
    amount: number;
    unit: string;
  };
}

// const shite2 = shite.parse("l");

function SchemaTag({
  schema,
  layers = 0,
}: {
  schema: TSchema;
  layers?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  switch (schema.type) {
    case TypeName.Entity:
      return (
        <code>
          {"Entity<"}
          {schema.entityType
            ? ENTITY_TYPE_NAMES[schema.entityType as EntityType]
            : "unknown"}
          {">"}
        </code>
      );
    case TypeName.Array:
      return (
        <code>
          {"Array<"}
          <SchemaTag schema={schema.items} />
          {">"}
        </code>
      );
    case TypeName.Object:
      return (
        <code>
          <button
            onClick={() => {
              setExpanded((prev) => !prev);
            }}
          >
            {`Object${expanded ? ` {` : "<"}`}
          </button>

          {expanded ? (
            <div className="ml-4 flex flex-col">
              {Object.entries(schema.properties).map(([key, value]) => (
                <code key={key}>
                  <span className="text-gray-400">{key}:</span>{" "}
                  <SchemaTag schema={value} />
                </code>
              ))}
            </div>
          ) : (
            <button onClick={() => setExpanded(true)}>...</button>
          )}
          {expanded ? "}" : ">"}
        </code>
      );
    default:
      return <code>{schema.type}</code>;
  }
}

function ShowSchema({ schema }: { schema: TSchema }) {
  // format using ts-morph
  const formatted = useMemo(() => {
    const ts = getNamedTS(schema);
    try {
      const project = new Project({
        useInMemoryFileSystem: true,
        manipulationSettings: {
          indentationText: IndentationText.FourSpaces,
        },
      });
      const file = project.createSourceFile(
        "test.ts",
        ts.replace(/{/g, "{\n").replace(/;/g, ";\n")
      );
      file.formatText({
        indentMultiLineObjectLiteralBeginningOnBlankLine: true,
      });

      return file.getFullText();
    } catch (e) {
      console.error(e);
      return ts;
    }
  }, [schema]);
  return (
    <div className="p-4 border shadow">
      <div className="font-bold">Schema</div>
      <pre className="text-gray-800">{JSON.stringify(schema, null, 2)}</pre>
      <div className="h-8"></div>
      <div className="font-bold">Type tag</div>
      <SchemaTag schema={schema} />
      <div className="h-8"></div>
      <div className="font-bold">TypeScript</div>
      <pre className="text-blue-500">{formatted}</pre>
    </div>
  );
}

export default function Page() {
  const { data: eventTypes } = api.eventTypes.list.useQuery();

  return (
    <div className="text-sm p-4 flex flex-col gap-4">
      <ShowSchema schema={cardEntity.schema} />
      <ShowSchema schema={location.schema} />
    </div>
  );
}

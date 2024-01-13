"use client";
import { TSchema, TypeName } from "event-processing/src/data-types";
import { useState } from "react";
import { api } from "../utils/api";

// const shite2 = shite.parse("l");
export function SchemaTag({ schema }: { schema: TSchema }) {
  const [expanded, setExpanded] = useState(false);
  const { data: entityTypes } = api.entityTypes.list.useQuery();
  switch (schema.type) {
    case TypeName.Entity:
      return (
        <code>
          {"Entity<"}
          {schema.entityType
            ? entityTypes?.find(
                (entityType) => entityType.id === schema.entityType
              )?.type
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

import {
  DataPath,
  NodeDef,
  TSchema,
  TypeName,
  createDataType,
} from "event-processing";
import { run } from "json_typegen_wasm";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "~/utils/api";

interface EventTypeNodesSchemaDisplayProps {
  eventType: string;
  onItemClick?: (dataPath: DataPath) => void;
  renderRightComponent?: (dataPath: DataPath) => React.ReactNode;
}

export function EventTypeNodesSchemaDisplay({
  eventType,
  onItemClick,
  renderRightComponent,
}: EventTypeNodesSchemaDisplayProps) {
  const { data: nodes } = api.nodeDefs.list.useQuery(
    { eventType },
    { enabled: !!eventType }
  );

  return (
    <div>
      {nodes?.map((node) => {
        return (
          <div key={node.id}>
            <SchemaDisplay
              name={node.name}
              path={[]}
              schema={node.returnSchema}
              onItemClick={({ path, schema }) => {
                onItemClick?.({
                  nodeId: node.id,
                  path,
                  schema,
                });
              }}
              renderRightComponent={({ path, schema }) => {
                return renderRightComponent?.({
                  nodeId: node.id,
                  path,
                  schema,
                });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

interface SchemaDisplayProps {
  name: string;
  path: string[];
  schema: TSchema;
  onItemClick?: (props: {
    name: string;
    path: string[];
    schema: TSchema;
  }) => void;
  renderRightComponent?: (props: {
    name: string;
    path: string[];
    schema: TSchema;
  }) => React.ReactNode;
}

export function SchemaDisplay(props: SchemaDisplayProps) {
  const { name, path, schema, onItemClick, renderRightComponent } = props;

  const [collapsed, setCollapsed] = useState(false);

  if (schema.type === TypeName.Object) {
    return (
      <>
        <div className="flex items-center gap-1 pt-0.5">
          <button
            onClick={() => {
              onItemClick?.({ name, path, schema });
            }}
          >
            {name}
          </button>
          <button
            onClick={() => {
              setCollapsed((p) => !p);
            }}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
        {!collapsed &&
          (schema.properties && Object.keys(schema.properties).length ? (
            <div className="ml-0 border-l pl-4">
              {Object.entries(schema.properties ?? {}).map(([key, value]) => {
                const entryPath = path ? [...path, key] : [key];

                return (
                  <div key={key}>
                    <SchemaDisplay
                      name={key}
                      path={entryPath}
                      schema={value}
                      onItemClick={onItemClick}
                      renderRightComponent={renderRightComponent}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <span className="italic opacity-40 ml-4">empty</span>
          ))}
      </>
    );
  }

  return (
    <div className="pt-0.5 flex items-center">
      <button
        onClick={() => {
          onItemClick?.({ name, path, schema });
        }}
      >
        {name}: <span className="opacity-50">{schema.type ?? "?"}</span>
      </button>
      {renderRightComponent?.({ name, path, schema })}
    </div>
  );
}

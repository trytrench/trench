import { createDataType } from "event-processing";
import { run } from "json_typegen_wasm";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import {
  FeatureDep,
  NodeDep,
} from "~/pages/settings/event-types/[eventTypeId]/node/NodeDepSelector";
import { api } from "~/utils/api";

interface SchemaDisplayProps {
  eventTypeId: string;
  onItemClick?: (path: string, name: string) => void;
  basePath?: string;
  baseName?: string;
  renderRightComponent?: (path: string) => React.ReactNode;
}

export function SchemaDisplay({
  eventTypeId,
  onItemClick,
  basePath = "",
  baseName = "",
  renderRightComponent,
}: SchemaDisplayProps) {
  const schemaObj = useEventSchema(eventTypeId);

  return (
    <SchemaEntry
      name={baseName}
      path={basePath}
      info={schemaObj}
      onItemClick={onItemClick}
      renderRightComponent={renderRightComponent}
    />
  );
}

//

export function useEventSchema(eventTypeId: string) {
  const { data: eventType } = api.eventTypes.get.useQuery({ id: eventTypeId });

  return useMemo(() => {
    if (!eventType) return {};

    return JSON.parse(
      run(
        "Root",
        JSON.stringify(eventType.exampleEvent),
        JSON.stringify({ output_mode: "json_schema" })
      )
    );
  }, [eventType]);
}

// TODO: Support object types
export function useDepsSchema(
  eventTypeId: string,
  nodeDeps: NodeDep[],
  featureDeps: FeatureDep[]
) {
  const { data: nodeDefs } = api.nodeDefs.list.useQuery({
    eventTypeId,
  });
  const { data: featureDefs } = api.features.list.useQuery();

  const featureProperties = useMemo(
    () =>
      featureDeps.reduce(
        (acc, dep) => {
          const featureDef = featureDefs?.find(
            (def) => def.id === dep.featureId
          );
          if (!featureDef) return acc;

          if (!acc[dep.nodeName]) {
            acc[dep.nodeName] = { type: "object", properties: {} };
          }

          acc[dep.nodeName]!.properties[dep.featureName] = {
            type: createDataType(featureDef.schema).toTypescript(),
          };
          return acc;
        },
        {} as Record<
          string,
          { type: string; properties: Record<string, unknown> }
        >
      ),
    [featureDeps, featureDefs]
  );

  const nodeProperties = useMemo(() => {
    return nodeDeps.reduce(
      (acc, dep) => {
        const nodeDef = nodeDefs?.find((def) => def.id === dep.nodeId);
        if (!nodeDef) return acc;

        acc[nodeDef.name] = {
          type: createDataType(nodeDef.returnSchema).toTypescript(),
        };
        return acc;
      },
      {} as Record<string, unknown>
    );
  }, [nodeDeps, nodeDefs]);

  return {
    type: "object",
    properties: {
      ...featureProperties,
      ...nodeProperties,
    },
  };
}

export function useDepsTypes(
  eventTypeId: string,
  nodeDeps: NodeDep[],
  featureDeps: FeatureDep[]
) {
  const { data: nodeDefs } = api.nodeDefs.list.useQuery({
    eventTypeId,
  });
  const { data: featureDefs } = api.features.list.useQuery();

  return useMemo(() => {
    let typeDef = "interface Dependencies {\n";

    const nodeNames = featureDeps.reduce(
      (acc, dep) => {
        const featureDef = featureDefs?.find((def) => def.id === dep.featureId);
        if (!featureDef) return acc;

        if (!acc[dep.nodeName]) acc[dep.nodeName] = [];

        acc[dep.nodeName]!.push(
          `"${dep.featureName}": ${createDataType(
            featureDef.schema
          ).toTypescript()}`
        );
        return acc;
      },
      {} as Record<string, string[]>
    );

    for (const nodeName in nodeNames) {
      typeDef += `  "${nodeName}": {\n`;
      typeDef +=
        nodeNames[nodeName]
          .map((featureName) => `    ${featureName}`)
          .join(";\n") + ";\n";

      typeDef += "  };\n";
    }

    for (const dep of nodeDeps) {
      const nodeDef = nodeDefs?.find((def) => def.id === dep.nodeId);
      if (!nodeDef) continue;

      typeDef += `  "${nodeDef.name}": ${createDataType(
        nodeDef.returnSchema
      ).toTypescript()};\n`;
    }
    typeDef += "}";

    return typeDef;
  }, [nodeDefs, featureDefs, nodeDeps, featureDeps]);
}

type InfoType = {
  type?: string;
  properties?: object;
};

interface SchemaEntryProps {
  name: string;
  path: string;
  info: InfoType;
  onItemClick?: (path: string, name: string) => void;
  renderRightComponent?: (path: string) => React.ReactNode;
}

export function SchemaEntry(props: SchemaEntryProps) {
  const { name, path, info, onItemClick, renderRightComponent } = props;

  const [collapsed, setCollapsed] = useState(false);

  if (info.type === "object") {
    return (
      <>
        <div className="flex items-center gap-1 pt-0.5">
          <button
            onClick={() => {
              onItemClick?.(path, name);
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
          (info.properties && Object.keys(info.properties).length ? (
            <div className="ml-0 border-l pl-8">
              {Object.entries(info.properties ?? {}).map(([key, value]) => {
                const entryPath = path ? `${path}.${key}` : key;

                return (
                  <div key={entryPath}>
                    <SchemaEntry
                      name={key}
                      path={entryPath}
                      info={value}
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
          onItemClick?.(path, name);
        }}
      >
        {name}: <span className="opacity-50">{info.type ?? "?"}</span>
      </button>
      {renderRightComponent?.(path)}
    </div>
  );
}

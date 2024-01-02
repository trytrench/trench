import { run } from "json_typegen_wasm";
import { merge } from "lodash";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "~/utils/api";

interface SchemaDisplayProps {
  eventTypes: Set<string>;
  onItemClick?: (path: string, name: string) => void;
  basePath?: string;
  baseName?: string;
  renderRightComponent: (path: string) => React.ReactNode;
}

export function SchemaDisplay(props: SchemaDisplayProps) {
  const {
    eventTypes,
    onItemClick,
    basePath = "",
    baseName = "",
    renderRightComponent,
  } = props;
  const schemaObj = useEventSchema({ eventTypes });

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

function useEventSchema(props: { eventTypes: Set<string> }) {
  const { eventTypes } = props;
  const { data } = api.eventTypes.list.useQuery();

  const applicableEventTypes = useMemo(() => {
    return data?.filter((et) => eventTypes.has(et.id)) ?? [];
  }, [data, eventTypes]);

  // merge all the example events into one
  // and then infer the schema from that
  const schemaJSON = useMemo(() => {
    const mergedEvent = merge(
      {},
      ...applicableEventTypes.map((et) => et.exampleEvent)
    );

    return run(
      "Root",
      JSON.stringify(mergedEvent),
      JSON.stringify({ output_mode: "json_schema" })
    );
  }, [applicableEventTypes]);

  return useMemo(() => {
    if (!schemaJSON) return {};
    return JSON.parse(schemaJSON);
  }, [schemaJSON]);
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
  renderRightComponent: (path: string) => React.ReactNode;
}

function SchemaEntry(props: SchemaEntryProps) {
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
      {renderRightComponent(path)}
    </div>
  );
}

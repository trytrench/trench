import {
  DataPath,
  NodeDef,
  FnType,
  TSchema,
  TypeName,
  createDataType,
  NodeDefAny,
} from "event-processing";
import { api } from "../../utils/api";
import { useMemo } from "react";
import { SchemaTag } from "../SchemaTag";
import { uniqBy } from "lodash";
import { ComboboxSelector } from "../ComboboxSelector";
import { Badge } from "../ui/badge";
import { ChevronDown } from "lucide-react";
import { useEditorStore, selectors } from "./editor/state/zustand";

const HIDDEN_NODE_TYPES = [
  FnType.GetEntityFeature,
  FnType.LogEntityFeature,
  FnType.CacheEntityFeature,
];

function useFlattenedDataPaths(props: {
  eventType: string;
  filterNodeOptions?: (nodeDef: NodeDefAny) => boolean;
}) {
  const {
    eventType,
    filterNodeOptions = (nodeDef) => {
      return !HIDDEN_NODE_TYPES.includes(nodeDef.fn.type);
    },
  } = props;

  const nodes = useEditorStore(selectors.getNodeDefs({ eventType }));

  const flattenedDataPaths = useMemo(() => {
    const dataPaths: DataPath[] = [];

    const getPaths = (
      schema: TSchema,
      prefix: string[]
    ): {
      path: string[];
      schema: TSchema;
    }[] => {
      const allPaths: {
        path: string[];
        schema: TSchema;
      }[] = [];
      if (schema.type === TypeName.Object) {
        for (const [key, subSchema] of Object.entries(schema.properties)) {
          const subPaths = getPaths(subSchema, [...prefix, key]);
          allPaths.push(...subPaths);
        }
      } else {
        return [
          {
            path: prefix,
            schema,
          },
        ];
      }

      return allPaths;
    };

    const filteredNodes = nodes?.filter(filterNodeOptions);

    for (const node of filteredNodes ?? []) {
      const paths = getPaths(node.fn.returnSchema, []);
      for (const path of paths) {
        dataPaths.push({
          nodeId: node.id,
          path: path.path,
          schema: path.schema,
        });
      }
    }

    return dataPaths;
  }, [filterNodeOptions, nodes]);

  return {
    flattenedDataPaths,
  };
}

interface SelectDataPathProps {
  eventType: string;
  value: DataPath | null;
  disablePathSelection?: boolean;

  filterNodeOptions?: (nodeDef: NodeDefAny) => boolean;

  onChange: (value: DataPath | null) => void;
  onIsValidChange?: (isValid: boolean) => void;

  desiredSchema?: TSchema;
}

export function SelectDataPath(props: SelectDataPathProps) {
  const {
    eventType,
    value,
    onChange,
    filterNodeOptions,
    desiredSchema,
    disablePathSelection = false,
  } = props;

  const nodes = useEditorStore(selectors.getNodeDefs({ eventType }));

  const { flattenedDataPaths } = useFlattenedDataPaths({
    eventType,
    filterNodeOptions,
  });

  const filteredPaths = flattenedDataPaths.filter((path) => {
    const desiredType = createDataType(desiredSchema ?? { type: TypeName.Any });

    return desiredType.isSuperTypeOf(path.schema);
  });

  const filteredOptions = filteredPaths
    .filter((path) => path.nodeId === value?.nodeId)
    .map((path) => ({
      label: path.path.join("."),
      value: path.path.join("."),
    }))
    .filter((option) => !!option.value);

  const validNodes = uniqBy(filteredPaths, (path) => path.nodeId).map(
    (path) => ({
      label: nodes?.find((node) => node.id === path.nodeId)?.name ?? "",
      value: path.nodeId,
    })
  );

  return (
    <div className="flex justify-start items-center gap-2">
      <ComboboxSelector
        value={value?.nodeId ?? ""}
        onSelect={(newValue) => {
          if (!newValue) {
            onChange(null);
            return;
          }
          onChange({
            path: [],
            nodeId: newValue,
            schema: nodes?.find((node) => node.id === newValue)?.fn
              .returnSchema ?? { type: TypeName.Any },
          });
        }}
        options={validNodes}
        renderTrigger={({ value }) => {
          if (!value) {
            return (
              <button className="whitespace-nowrap">
                <Badge className="text-gray-400">Select a node...</Badge>
              </button>
            );
          }

          const node = nodes?.find((node) => node.id === value);
          if (!node) {
            return <div>Could not find node...</div>;
          }
          return (
            <button className="whitespace-nowrap">
              <Badge className="">
                {node.name}
                <ChevronDown className="w-3 h-3 ml-1" />
              </Badge>
            </button>
          );
        }}
      />
      {filteredOptions.length > 0 && !disablePathSelection && (
        <ComboboxSelector
          value={value?.path.join(".") ?? ""}
          onSelect={(newValue) => {
            const newDataPath = flattenedDataPaths.find(
              (path) => path.path.join(".") === newValue
            );
            onChange({
              nodeId: value?.nodeId ?? "",
              path: newDataPath?.path ?? [],
              schema: newDataPath?.schema ?? { type: TypeName.Any },
            });
          }}
          renderOption={({ option }) => {
            const schema = flattenedDataPaths.find(
              (path) => path.path.join(".") === option.value
            )?.schema;
            if (!schema) {
              return null;
            }
            return (
              <div className="flex w-full justify-start">
                <div className="text-gray-400">{option.label}</div>
                <div className="ml-4">
                  <SchemaTag schema={schema} />
                </div>
              </div>
            );
          }}
          options={filteredOptions}
          renderTrigger={({ value }) => {
            if (!value) {
              return (
                <button className="flex justify-start items-center text-sm text-gray-400 font-mono whitespace-nowrap">
                  Select a path...
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
              );
            }
            const schema = flattenedDataPaths.find(
              (path) => path.path.join(".") === value
            )?.schema;
            if (!schema) {
              return null;
            }
            return (
              <button className="flex justify-start items-center text-sm text-black font-mono">
                {value}
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
            );
          }}
        />
      )}
    </div>
  );
}

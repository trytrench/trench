import { DataPath, TSchema, TypeName, createDataType } from "event-processing";
import { api } from "../../utils/api";
import { useMemo } from "react";
import { SchemaTag } from "../SchemaTag";
import { uniqBy } from "lodash";
import { ComboboxSelector } from "../ComboboxSelector";
import { Badge } from "../ui/badge";
import { ChevronDown } from "lucide-react";

// function useFlattenedFeaturePaths(props: {
//   baseDataPath: DataPath;
//   maxDepth?: number;
//   desiredSchema?: TSchema;
// }) {
//   const { baseDataPath, maxDepth = 4 } = props;

//   const { data: features } = api.features.list.useQuery();

//   const flattenedFeaturePaths = useMemo(() => {
//     const featurePaths: DataPath[] = [];
//     if (!features) return [];

//     const desiredType = createDataType(
//       props.desiredSchema ?? { type: TypeName.Any }
//     );

//     /**
//      * First, make sure baseDataPath.schema is of type Entity.
//      * Then, get all features for the schema.entityTypeId.
//      * Filter out all features whose schema is either:
//      *  - a subtype of desiredSchema -> return
//      *  - an entity type -> recurse
//      * Essentially we want to discover all feature paths that are of the desired schema,
//      * but we stop at the maxDepth.
//      */

//     const getPaths = (
//       schema: TSchema,
//       prefix: string[],
//       depth: number
//     ): {
//       path: string[];
//       schema: TSchema;
//     }[] => {
//       const allPaths: {
//         path: string[];
//         schema: TSchema;
//       }[] = [];

//       if (depth >= maxDepth) {
//         return allPaths;
//       }

//       if (schema.type === TypeName.Entity) {
//         const entityFeatures = features.filter(
//           (feature) => feature.entityTypeId === schema.entityType
//         );
//         for (const feature of entityFeatures) {
//           const subPaths = getPaths(
//             feature.schema,
//             [...prefix, feature.id],
//             depth + 1
//           );
//           allPaths.push(...subPaths);
//         }
//       } else if (desiredType.isSuperTypeOf(schema)) {
//         return [
//           {
//             path: prefix,
//             schema,
//           },
//         ];
//       }

//       return allPaths;
//     };

//     const paths = getPaths(baseDataPath.schema, [], 0);
//     for (const path of paths) {
//       featurePaths.push({
//         ...baseDataPath,
//         featurePath: path.path,
//         featureSchema: path.schema,
//       });
//     }
//     return featurePaths;
//   }, [baseDataPath, features, maxDepth, props.desiredSchema]);

//   return {
//     flattenedFeaturePaths,
//   };
// }

function useFlattenedDataPaths(props: { eventType: string }) {
  const { eventType } = props;

  const { data: nodes } = api.nodeDefs.list.useQuery({ eventType });

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

    for (const node of nodes ?? []) {
      const paths = getPaths(node.returnSchema, []);
      for (const path of paths) {
        dataPaths.push({
          nodeId: node.id,
          path: path.path,
          schema: path.schema,
        });
      }
    }

    return dataPaths;
  }, [nodes]);

  return {
    flattenedDataPaths,
  };
}

interface SelectDataPathProps {
  eventType: string;
  value: DataPath | null;
  disablePathSelection?: boolean;

  onChange: (value: DataPath | null) => void;
  onIsValidChange?: (isValid: boolean) => void;

  desiredSchema?: TSchema;
}

export function SelectDataPath(props: SelectDataPathProps) {
  const {
    eventType,
    value,
    onChange,
    desiredSchema,
    disablePathSelection = false,
  } = props;

  const { data: nodes } = api.nodeDefs.list.useQuery({ eventType });

  const { flattenedDataPaths } = useFlattenedDataPaths({
    eventType,
  });

  // const { flattenedFeaturePaths } = useFlattenedFeaturePaths({
  //   baseDataPath: value ?? {
  //     nodeId: "",
  //     path: [],
  //     featurePath: [],
  //     schema: { type: TypeName.Any },
  //   },
  //   desiredSchema,
  // });

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

  // const filteredFeatureOptions = flattenedFeaturePaths
  //   .map((path) => ({
  //     label: path.featurePath!.join("."),
  //     value: path.featurePath!.join("."),
  //   }))
  //   .filter((option) => !!option.value);

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
            schema: nodes?.find((node) => node.id === newValue)
              ?.returnSchema ?? { type: TypeName.Any },
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
      {/* {value?.schema.type === TypeName.Entity && (
        <ComboboxSelector
          value={value?.featurePath?.join(".") ?? null}
          onSelect={(newValue) => {
            const newDataPath = flattenedFeaturePaths.find(
              (path) => path.featurePath?.join(".") === newValue
            );
            onChange(
              newDataPath ?? {
                ...value,
                featurePath: undefined,
                featureSchema: undefined,
              }
            );
          }}
          renderOption={({ option, selected }) => {
            const path = flattenedFeaturePaths.find(
              (path) => path.featurePath?.join(".") === option.value
            );
            if (!path) {
              return null;
            }
            return (
              <div className="flex w-full justify-start">
                <div className="text-gray-400">
                  <RenderFeaturePath featurePath={path.featurePath ?? []} />
                </div>
                <div className="ml-4">
                  <SchemaTag
                    schema={path.featureSchema ?? { type: TypeName.Any }}
                  />
                </div>
              </div>
            );
          }}
          options={filteredFeatureOptions}
          renderTrigger={({ value }) => {
            if (!value) {
              return (
                <button className="flex justify-start items-center text-sm text-gray-400 font-mono">
                  Select a path...
                  <ChevronDown className="w-3 h-3 ml-1" />
                </button>
              );
            }
            const path = flattenedFeaturePaths.find(
              (path) => path.featurePath?.join(".") === value
            );
            if (!path) {
              return null;
            }
            return (
              <button className="flex justify-start items-center text-sm text-black font-mono">
                <RenderFeaturePath featurePath={path.featurePath ?? []} />
                <ChevronDown className="w-3 h-3 ml-1" />
              </button>
            );
          }}
        />
      )} */}
    </div>
  );
}

// function RenderFeaturePath(props: { featurePath: string[] }) {
//   const { featurePath } = props;
//   const { data: features } = api.features.list.useQuery({});

//   const featureNames = featurePath.map((featureId) => {
//     const feature = features?.find((feature) => feature.id === featureId);
//     return feature?.name ?? featureId;
//   });
//   return (
//     <div className="flex items-center gap-2">
//       <div className="text-gray-400">{featureNames.join("->")}</div>
//     </div>
//   );
// }

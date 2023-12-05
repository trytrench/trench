// For the feature editor: name, type, and import alias.
// These properties are common to all feature types.

import {
  DataType,
  FeatureDef,
  FeatureDefs,
  FeatureType,
  FeatureTypeDefs,
} from "event-processing";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { api } from "~/utils/api";
import { DepsMapEditor } from "../shared/DepsMapEditor";
import { CodeEditor, CompileStatus } from "../shared/CodeEditor";
import { AssignedEntitySelector } from "../shared/AssignedEntitySelector";

// - the monaco editor ig? unsure

interface EditComputedProps {
  featureDef: FeatureDefs[FeatureType.Computed];
  onFeatureDefChange?: (featureDef: FeatureDefs[FeatureType.Computed]) => void;
  onValidChange?: (valid: boolean) => void;
}

function EditComputed(props: EditComputedProps) {
  const { featureDef, onFeatureDefChange, onValidChange } = props;

  const config = featureDef?.config;
  const depsMap = config?.depsMap ?? {};
  const assignedEntityFeatureIds = config?.assignedEntityFeatureIds ?? [];

  const prefix = usePrefix({
    dataType: featureDef.dataType,
    dependencies: depsMap,
  });

  return (
    <>
      <AssignedEntitySelector
        entityFeatureIds={assignedEntityFeatureIds}
        onEntityFeatureIdsChange={(assignedEntityFeatureIds) => {
          const depsMapFeatureIds = Object.values(depsMap);
          onFeatureDefChange?.({
            ...featureDef,
            config: {
              ...config,
              assignedEntityFeatureIds,
            },
            dependsOn: new Set([
              ...depsMapFeatureIds,
              ...assignedEntityFeatureIds,
            ]),
          });
        }}
      />
      <div className="mt-16"></div>
      <DepsMapEditor
        featureDef={featureDef}
        onFeatureDefChange={onFeatureDefChange}
      />

      <div className="mt-16" />

      <CodeEditor
        prefix={prefix}
        suffix={"}"}
        initialCode={featureDef?.config?.tsCode ?? ""}
        onCompileStatusChange={(compileStatus) => {
          if (compileStatus.status === "success") {
            onValidChange?.(true);
            onFeatureDefChange?.({
              ...featureDef,
              config: {
                ...config,
                tsCode: compileStatus.code,
                compiledJs: compileStatus.compiled,
              },
            });
          } else {
            onValidChange?.(false);
          }
        }}
      />
    </>
  );
}

export { EditComputed };

//

const DataTypeToTsType: Record<DataType, string> = {
  [DataType.Boolean]: "boolean",
  [DataType.Int64]: "number",
  [DataType.Float64]: "number",
  [DataType.String]: "string",
  [DataType.Entity]: "string",
  [DataType.Object]: "any",
};

function usePrefix(props: {
  dataType: DataType;
  dependencies: Record<string, string>;
}) {
  const { dataType, dependencies } = props;
  const { data: allFeatureDefs } = api.featureDefs.allInfo.useQuery({});

  const depInterface = useMemo(() => {
    const lines = Object.entries(dependencies).map(([alias, featureId]) => {
      const feature = allFeatureDefs?.find((v) => v.id === featureId);
      if (!feature) return;
      return `  ${alias}: ${DataTypeToTsType[feature.dataType as DataType]};\n`;
    });

    return `interface Dependencies {\n${lines.join("")}}`;
  }, [dependencies, allFeatureDefs]);

  const inputInterface = `interface Input {\n  event: TrenchEvent;\n  deps: Dependencies;\n}`;
  const functionSignature = `async function getFeature(input: Input): Promise<${DataTypeToTsType[dataType]}> {`;

  return [depInterface, inputInterface, functionSignature].join("\n\n");
}

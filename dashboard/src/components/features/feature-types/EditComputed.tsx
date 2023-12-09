// For the feature editor: name, type, and import alias.
// These properties are common to all feature types.

import { DataType, FeatureDefs, FeatureType } from "event-processing";
import { useMemo } from "react";
import { api } from "~/utils/api";
import { DepsMapEditor } from "../shared/DepsMapEditor";
import { CodeEditor } from "../shared/CodeEditor";
import { FeatureMultiSelect } from "../shared/FeatureMultiSelect";

// - the monaco editor ig? unsure

type Config = FeatureDefs[FeatureType.Computed]["config"];

interface EditComputedProps {
  featureDef: FeatureDefs[FeatureType.Computed];
  onFeatureDefChange?: (featureDef: FeatureDefs[FeatureType.Computed]) => void;
  onValidChange?: (valid: boolean) => void;
}

function EditComputed(props: EditComputedProps) {
  const { featureDef, onFeatureDefChange, onValidChange } = props;

  const { config } = featureDef;
  const { depsMap, assignedEntityFeatureIds } = config;

  const prefix = usePrefix({
    dataType: featureDef.dataType,
    dependencies: depsMap,
  });

  function updateConfigAndDeps(val: Partial<Config>) {
    const newConfig = {
      ...config,
      ...val,
    };

    onFeatureDefChange?.({
      ...featureDef,
      config: newConfig,
      dependsOn: new Set([
        ...Object.values(newConfig.depsMap),
        ...newConfig.assignedEntityFeatureIds,
      ]),
    });
  }

  return (
    <>
      {/* Assigned Entities */}
      <FeatureMultiSelect
        featureIds={assignedEntityFeatureIds}
        onFeatureIdsChange={(val) => {
          updateConfigAndDeps({ assignedEntityFeatureIds: val });
        }}
        filter={{ featureType: FeatureType.EntityAppearance }}
        label="Assigned Entities"
      />

      <div className="mt-16"></div>

      <DepsMapEditor
        depsMap={depsMap}
        onChange={(val) => {
          updateConfigAndDeps({ depsMap: val });
        }}
      />

      <div className="mt-16" />

      <CodeEditor
        prefix={prefix}
        suffix={"}"}
        initialCode={featureDef.config?.tsCode ?? ""}
        onCompileStatusChange={(compileStatus) => {
          if (compileStatus.status === "success") {
            onValidChange?.(true);
            updateConfigAndDeps({
              tsCode: compileStatus.code,
              compiledJs: compileStatus.compiled,
            });
          } else {
            updateConfigAndDeps({
              tsCode: compileStatus.code,
              compiledJs: undefined,
            });
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

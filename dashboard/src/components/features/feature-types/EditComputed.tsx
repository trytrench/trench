// For the feature editor: name, type, and import alias.
// These properties are common to all feature types.

import {
  DataType,
  FeatureDef,
  FeatureType,
  FeatureTypeDefs,
} from "event-processing";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { api } from "~/utils/api";
import { DepsMapEditor } from "../shared/DepsMapEditor";
import { CodeEditor, CompileStatus } from "../shared/CodeEditor";

// - the monaco editor ig? unsure

type ComputedFeatureConfig = z.infer<
  FeatureTypeDefs[FeatureType.Computed]["configSchema"]
>;
interface EditComputedProps {
  featureDef: Partial<FeatureDef>;
  onFeatureDefChange?: (featureDef: Partial<FeatureDef>) => void;
  onValidChange?: (valid: boolean) => void;
}

function EditComputed(props: EditComputedProps) {
  const { featureDef, onFeatureDefChange, onValidChange } = props;
  const deps = featureDef?.config?.depsMap ?? {};

  const [compileStatus, setCompileStatus] = useState<CompileStatus>();

  const prefix = usePrefix({
    dataType: featureDef?.dataType!,
    dependencies: deps,
  });

  // is everything in this section valid?
  useEffect(() => {
    onValidChange?.(compileStatus?.status === "success");
  }, [compileStatus]);

  // for updating the def
  useEffect(() => {
    if (!compileStatus || compileStatus.status !== "success") return;
    if (featureDef?.config?.tsCode === compileStatus.code) return; // this prevents an infinite rerender loop
    onFeatureDefChange?.({
      ...featureDef,
      config: {
        tsCode: compileStatus.code!,
        compiledJs: compileStatus.compiled!,
        depsMap: deps,
        assignedEntityFeatureIds: [],
      } as ComputedFeatureConfig,
    });
  }, [compileStatus, deps, onFeatureDefChange, featureDef]);

  return (
    <>
      <DepsMapEditor
        featureDef={featureDef}
        onFeatureDefChange={onFeatureDefChange}
      />

      <div className="mt-16" />

      <CodeEditor
        prefix={prefix}
        suffix={"}"}
        initialCode={featureDef?.config?.tsCode ?? ""}
        onCompileStatusChange={setCompileStatus}
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
  const { data: allFeatureDefs } = api.featureDefs.allInfo.useQuery();

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

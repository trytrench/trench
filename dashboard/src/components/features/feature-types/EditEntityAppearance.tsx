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
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// - the monaco editor ig? unsure

type Config = FeatureDefs[FeatureType.EntityAppearance]["config"];
interface EditEntityAppearanceProps {
  featureDef: FeatureDefs[FeatureType.EntityAppearance];
  onFeatureDefChange?: (
    featureDef: FeatureDefs[FeatureType.EntityAppearance]
  ) => void;
  onValidChange?: (valid: boolean) => void;
}

function EditEntityAppearance(props: EditEntityAppearanceProps) {
  const { featureDef, onFeatureDefChange, onValidChange } = props;

  const { config } = featureDef;
  const { depsMap, entityType } = config;

  const [compileStatus, setCompileStatus] = useState<CompileStatus>();

  const prefix = usePrefix({
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
      dependsOn: new Set([...Object.values(newConfig.depsMap)]),
    });

    // check if valid
    onValidChange?.(
      (compileStatus?.status === "success" || !!val.compiledJs) &&
        !!newConfig.entityType
    );
  }

  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const handleEntityTypeChange = (val: string) => {
    updateConfigAndDeps({ entityType: val });
  };

  return (
    <>
      {/* Feature Type */}
      <div className="flex flex-col gap-2">
        <Label>Entity Type</Label>
        <Select value={entityType} onValueChange={handleEntityTypeChange}>
          <SelectTrigger className="w-[20rem]">
            <SelectValue placeholder="Select Entity Type..." />
          </SelectTrigger>
          <SelectContent>
            {entityTypes?.map((entityType) => (
              <SelectItem key={entityType.id} value={entityType.type}>
                {entityType.type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-16" />

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
          setCompileStatus(compileStatus);
          if (compileStatus.status === "success") {
            updateConfigAndDeps({
              tsCode: compileStatus.code,
              compiledJs: compileStatus.compiled,
            });
          } else {
            onValidChange?.(false);
          }
        }}
      />
    </>
  );
}

export { EditEntityAppearance };
//

const DataTypeToTsType: Record<DataType, string> = {
  [DataType.Boolean]: "boolean",
  [DataType.Int64]: "number",
  [DataType.Float64]: "number",
  [DataType.String]: "string",
  [DataType.Entity]: "string",
  [DataType.Object]: "any",
};

function usePrefix(props: { dependencies: Record<string, string> }) {
  const { dependencies } = props;
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
  const functionSignature = `async function getEntityId(input: Input): Promise<string> {`;

  return [depInterface, inputInterface, functionSignature].join("\n\n");
}

//

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
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

// - the monaco editor ig? unsure

type ComputedEntityAppearanceConfig = z.infer<
  FeatureTypeDefs[FeatureType.EntityAppearance]["configSchema"]
>;
interface EditEntityAppearanceProps {
  featureDef: Partial<FeatureDef>;
  onFeatureDefChange?: (featureDef: Partial<FeatureDef>) => void;
  onValidChange?: (valid: boolean) => void;
}

function EditEntityAppearance(props: EditEntityAppearanceProps) {
  const { featureDef, onFeatureDefChange, onValidChange } = props;
  const deps = featureDef?.config?.depsMap ?? {};
  const entityType = featureDef?.config?.entityType;

  const [compileStatus, setCompileStatus] = useState<CompileStatus>();

  const prefix = usePrefix({
    dependencies: deps,
  });

  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const handleEntityTypeChange = (val: string) => {
    onFeatureDefChange?.({
      ...featureDef,
      config: {
        ...featureDef.config,
        entityType: val,
      } as ComputedEntityAppearanceConfig,
    });
  };

  // is everything in this section valid?
  useEffect(() => {
    onValidChange?.(compileStatus?.status === "success" && entityType);
  }, [compileStatus, entityType]);

  // for updating the def
  useEffect(() => {
    if (!compileStatus || compileStatus.status !== "success") return;
    if (featureDef?.config?.tsCode === compileStatus.code) return; // this prevents an infinite rerender loop
    onFeatureDefChange?.({
      ...featureDef,
      config: {
        ...featureDef.config,
        tsCode: compileStatus.code!,
        compiledJs: compileStatus.compiled!,
        depsMap: deps,
      } as ComputedEntityAppearanceConfig,
    });
  }, [compileStatus, deps, onFeatureDefChange, featureDef]);

  return (
    <>
      {/* Feature Type */}
      <div className="flex flex-col gap-1.5">
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
  const functionSignature = `async function getEntityId(input: Input): Promise<string> {`;

  return [depInterface, inputInterface, functionSignature].join("\n\n");
}

//

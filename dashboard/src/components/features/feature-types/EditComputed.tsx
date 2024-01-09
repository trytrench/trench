// For the feature editor: name, type, and import alias.
// These properties are common to all feature types.

import { DataType, NodeDef, NodeType, NODE_TYPE_DEFS } from "event-processing";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "~/utils/api";
import { DepsMapEditor } from "../shared/DepsMapEditor";
import {
  CodeEditor,
  CompileStatus,
  CompileStatusMessage,
} from "../shared/CodeEditor";
import { FeatureMultiSelect } from "../shared/FeatureMultiSelect";
import AssignEntities from "~/pages/settings/event-types/AssignEntities";
import { Editor, useMonaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { Button } from "~/components/ui/button";
import { useEventTypes } from "~/components/ts-editor/useEventTypes";
import { ChevronsUpDown } from "lucide-react";
import { Card } from "~/components/ui/card";

// - the monaco editor ig? unsure

const FUNCTION_TEMPLATE = `export const handler: Handler = async (input) => {\n\n}`;

// FIX
type Config = NodeDef["config"];

interface EditComputedProps {
  nodeDef: NodeDef;
  onFeatureDefChange?: (nodeDef: NodeDef) => void;
  onValidChange?: (valid: boolean) => void;
}

function EditComputed(props: EditComputedProps) {
  const { nodeDef, onFeatureDefChange, onValidChange } = props;
  const { resolvedTheme } = useTheme();
  const [compileStatus, setCompileStatus] = useState<CompileStatus>({
    status: "empty",
    code: "",
  });

  const [showTypes, setShowTypes] = useState(false);

  const theme = resolvedTheme === "dark" ? "vs-dark" : "vs-light";

  const { config } = nodeDef;
  const { depsMap, assignedEntityFeatureIds } = config;

  const prefix = usePrefix({
    dataType: nodeDef.dataType,
    dependencies: depsMap,
  });

  const eventTypes = useEventTypes();

  function updateConfigAndDeps(val: Partial<Config>) {
    const newConfig = {
      ...config,
      ...val,
    };

    onFeatureDefChange?.({
      ...nodeDef,
      config: newConfig,
      dependsOn: new Set([
        ...Object.values(newConfig.depsMap),
        ...newConfig.assignedEntityFeatureIds,
      ]),
    });
  }

  const onCompileStatusChange = useCallback(
    (compileStatus: CompileStatus) => {
      setCompileStatus(compileStatus);

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
    },
    [setCompileStatus, onValidChange]
  );

  return (
    <>
      {/* Assigned Entities */}
      {/* <FeatureMultiSelect
        featureIds={assignedEntityFeatureIds}
        onFeatureIdsChange={(val) => {
          updateConfigAndDeps({ assignedEntityFeatureIds: val });
        }}
        filter={{ featureType: NodeType.LogEntityFeature }}
        label="Assigned Entities"
      /> */}
      {/* <div className="mt-16"></div>

      <DepsMapEditor
        depsMap={depsMap}
        onChange={(val) => {
          updateConfigAndDeps({ depsMap: val });
        }}
      />

      <div className="mt-16" /> */}

      <div className="flex mb-4 items-center">
        <div className="text-emphasis-foreground text-md">Code</div>
        <Button
          variant="outline"
          size="sm"
          className="ml-4"
          onClick={() => setShowTypes(!showTypes)}
        >
          Types
          <ChevronsUpDown className="w-4 h-4 ml-1" />
        </Button>
        <div className="ml-auto" />
        <CompileStatusMessage compileStatus={compileStatus} />
      </div>

      {showTypes && (
        <Card className="h-40 mb-4">
          <Editor
            theme={theme}
            defaultLanguage="typescript"
            defaultValue={prefix}
          />
        </Card>
      )}

      <div className="h-96">
        <CodeEditor
          typeDefs={[eventTypes, prefix].join("\n\n")}
          initialCode={nodeDef.config?.tsCode ?? FUNCTION_TEMPLATE}
          onCompileStatusChange={onCompileStatusChange}
        />
      </div>
      <AssignEntities />
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
  const { data: allFeatureDefs } = api.nodeDefs.allInfo.useQuery({});

  const depInterface = useMemo(() => {
    const lines = Object.entries(dependencies).map(([alias, featureId]) => {
      const feature = allFeatureDefs?.find((v) => v.id === featureId);
      if (!feature) return;
      return `  ${alias}: ${DataTypeToTsType[feature.dataType as DataType]};\n`;
    });

    return `interface Dependencies {\n${lines.join("")}}`;
  }, [dependencies, allFeatureDefs]);

  const inputInterface = `interface Input {\n  event: TrenchEvent;\n  deps: Dependencies;\n}`;
  const functionType = `type Handler = (input: Input) => Promise<${DataTypeToTsType[dataType]}>;`;

  return [depInterface, inputInterface, functionType].join("\n\n");
}

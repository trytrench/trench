// For the feature editor: name, type, and import alias.
// These properties are common to all feature types.

import { NodeDef, createDataType } from "event-processing";
import { ChevronsUpDown } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useState } from "react";
import { useEventTypes } from "~/components/ts-editor/useEventTypes";
import { Button } from "~/components/ui/button";
import AssignEntities from "~/pages/settings/event-types/AssignEntities";
import {
  CodeEditor,
  CompileStatus,
  CompileStatusMessage,
} from "../shared/CodeEditor";

// - the monaco editor ig? unsure

const FUNCTION_TEMPLATE = `const getFeature: FeatureGetter = async (input) => {\n\n}`;

interface Props {
  nodeDef: NodeDef;
  onConfigChange: (config: NodeDef["config"]) => void;
  onValidChange: (valid: boolean) => void;
}

function EditComputed({ nodeDef, onConfigChange, onValidChange }: Props) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "vs-dark" : "vs-light";
  const [compileStatus, setCompileStatus] = useState<CompileStatus>({
    status: "empty",
    code: "",
  });

  const [showTypes, setShowTypes] = useState(false);

  const { config } = nodeDef;
  const { depsMap } = config;

  const prefix = usePrefix(nodeDef.returnSchema, depsMap);

  const eventTypes = useEventTypes();

  const onCompileStatusChange = useCallback(
    (compileStatus: CompileStatus) => {
      setCompileStatus(compileStatus);

      if (compileStatus.status === "success") {
        onValidChange(true);
        onConfigChange({
          tsCode: compileStatus.code,
          compiledJs: compileStatus.compiled
            .slice(compileStatus.compiled.indexOf("async"))
            .replace(/[;\n]+$/, ""),
        });
      } else {
        onConfigChange({
          tsCode: compileStatus.code,
          compiledJs: undefined,
        });
        onValidChange(false);
      }
    },
    [setCompileStatus, onValidChange, onConfigChange]
  );

  return (
    <>
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

      {/* {showTypes && (
        <Card className="h-40 mb-4">
          <Editor
            theme={theme}
            defaultLanguage="typescript"
            defaultValue={prefix}
          />
        </Card>
      )} */}

      <div className="h-96">
        <CodeEditor
          typeDefs={[eventTypes, prefix].join("\n\n")}
          initialCode={nodeDef.config?.tsCode ?? FUNCTION_TEMPLATE}
          onCompileStatusChange={onCompileStatusChange}
        />
      </div>
    </>
  );
}

export { EditComputed };

function usePrefix(
  returnSchema: Record<string, unknown>,
  dependencies: Record<string, string>
) {
  // const { dataType, dependencies } = props;
  // const { data: allFeatureDefs } = api.nodeDefs.allInfo.useQuery({});

  // const depInterface = useMemo(() => {
  //   const lines = Object.entries(dependencies).map(([alias, featureId]) => {
  //     const feature = allFeatureDefs?.find((v) => v.id === featureId);
  //     if (!feature) return;
  //     return `  ${alias}: ${DataTypeToTsType[feature.dataType as TypeName]};\n`;
  //   });

  //   return `interface Dependencies {\n${lines.join("")}}`;
  // }, [dependencies, allFeatureDefs]);
  const depInterface = `interface Dependencies {\n}`;

  const inputInterface = `interface Input {\n  event: TrenchEvent;\n  deps: Dependencies;\n}`;
  const functionType = `type FeatureGetter = (input: Input) => Promise<${createDataType(
    returnSchema
  ).toTypescript()}>;`;

  return [depInterface, inputInterface, functionType].join("\n\n");
}

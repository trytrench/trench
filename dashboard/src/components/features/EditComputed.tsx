// For the feature editor: name, type, and import alias.
// These properties are common to all feature types.

import { Label } from "../ui/label";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dependencies } from "./shared/Dependencies";
import { Button } from "../ui/button";
import { api } from "~/utils/api";
import { DataType } from "~/lib/create-feature/types";
import { MonacoEditor } from "../ts-editor/MonacoEditor";
import { CheckIcon, Loader2, Settings, XIcon } from "lucide-react";
import { Project, ts } from "ts-morph";
import { COMPILER_OPTIONS } from "../ts-editor/compilerOptions";
import { FeatureType } from "~/lib/create-feature/types";
import { toast } from "../ui/use-toast";

// - the monaco editor ig? unsure

interface EditComputedProps {
  data: {
    projectId: string;
    featureName: string;
    featureType: FeatureType;
    dataType: DataType;
    eventTypes: string[];
  };
  onDepsChange?: (deps: string[]) => void;
  onConfigChange?: (config: any) => void;
  onValidChange?: (valid: boolean) => void;
}

function EditComputed(props: EditComputedProps) {
  const { projectId, featureName, featureType, dataType, eventTypes } =
    props.data;

  const [dependencies, setDependencies] = useState<Record<string, string>>({});

  const [valid, setValid] = useState(false);

  const [returnType, setReturnType] = useState<"string" | "boolean" | "number">(
    "string"
  );

  const [code, setCode] = useState("");

  const [compileStatus, setCompileStatus] = useState<{
    status: "empty" | "compiling" | "success" | "error";
    message?: string;
    code?: string;
  }>({
    status: "empty",
  });

  const { prefix, suffix } = usePrefixAndSuffix({
    projectId: projectId,
    dataType: dataType,
    featureType: featureType!,
    dependencies: dependencies,
  });

  const compile = useCallback(() => {
    setCompileStatus({
      status: "compiling",
      message: "Compiling...",
    });

    const LIB_SOURCE = `
    type TrenchEvent = {
      type: string;
      timestamp: Date;
      data: any;
    };
    `;

    const finalCode = [prefix, code, suffix, LIB_SOURCE].join("\n");

    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: COMPILER_OPTIONS,
    });

    const file = project.createSourceFile("main.ts", finalCode);

    const allDiagnostics = project.getPreEmitDiagnostics();
    // const allDiagnostics = ts.getPreEmitDiagnostics(program); // check these

    // const sourceFile = program.getS("main.ts");
    // sourceFile?.parent.getDed;
    if (!allDiagnostics.length) {
      const transpiledOutput = ts.transpileModule(finalCode, {
        compilerOptions: {
          ...COMPILER_OPTIONS,
        },
      });

      setCompileStatus({
        status: "success",
        message: "Compiled successfully",
        code: transpiledOutput.outputText,
      });
    } else {
      const lineNum = allDiagnostics[0]?.getLineNumber();
      toast({
        variant: "destructive",
        title: lineNum ? `Error in line ${lineNum}` : "Compile error",
        description: allDiagnostics[0]?.getMessageText().toString(),
      });
      setCompileStatus({
        status: "error",
        message: "There was an error compiling your code",
        diagnostics: allDiagnostics,
      });
    }
  }, [code, prefix, setCompileStatus, suffix]);

  useEffect(() => {
    // todo: validate other stuff
    setValid(compileStatus.status === "success");
  }, [compileStatus]);

  useEffect(() => {
    props.onValidChange?.(valid);
  }, [valid]);

  useEffect(() => {
    props.onDepsChange?.(Object.keys(dependencies));
  }, [dependencies]);

  useEffect(() => {
    props.onConfigChange?.({
      tsCode: code,
      compiledJs: compileStatus.code,
      depsMap: dependencies,
    });
  }, [returnType, compileStatus, dependencies]);

  return (
    <>
      <Dependencies
        featureId={null}
        dependencies={dependencies}
        onChange={setDependencies}
      />

      <div className="mt-16" />

      <div className="flex flex-col gap-2 mb-4">
        <Label className="text-emphasis-foreground text-md">Code</Label>
      </div>

      <div className="flex mb-2 gap-4">
        <Button variant="outline" className="gap-1.5" onClick={compile}>
          <Settings className="w-4 h-4" />
          Compile
        </Button>
        <CompileStatusIndicator compileStatus={compileStatus} />
      </div>

      <div className="h-96">
        <MonacoEditor
          prefix={prefix}
          suffix={suffix}
          value={code}
          onValueChange={(change) => {
            setCode(change);
            setCompileStatus({
              status: "empty",
            });
          }}
          className="h-96 w-full"
          options={{
            padding: {
              top: 16,
              bottom: 16,
            },
          }}
        />
      </div>
    </>
  );
}

const usePrefixAndSuffix = (props: {
  projectId: string;
  featureType: FeatureType;
  dataType: DataType;
  dependencies: Record<string, string>;
}) => {
  const { projectId, featureType, dataType, dependencies } = props;

  const { data: allFeatureDefs } = api.featureDefs.allInfo.useQuery(
    {
      projectId: projectId,
    },
    {
      enabled: !!projectId,
    }
  );

  const depTypes = useMemo(() => {
    // Return dependencies but each value is mapped to the feature's type
    return Object.entries(dependencies).reduce((acc, [featureId, alias]) => {
      const feature = allFeatureDefs?.find((v) => v.id === featureId);
      if (!feature) return acc;
      return {
        ...acc,
        [alias]: feature.dataType,
      };
    }, {});
  }, [dependencies, allFeatureDefs]);

  const prefix = useMemo(() => {
    return `${depsToInterface(depTypes)}

interface Input {
  event: TrenchEvent;
  deps: Dependencies;
}

async function ${
      FeatureTypeToFunctionName[featureType]
    }(input: Input): Promise<${dataType}> {`;
  }, [dataType, depTypes, featureType]);

  const suffix = "}";

  return {
    prefix,
    suffix,
  };
};

function depsToInterface(deps: Record<string, DataType>) {
  const numDeps = Object.keys(deps).length;
  return `interface Dependencies {${
    numDeps > 0
      ? `\n${Object.entries(deps)
          .map(([name, type]) => `  ${name}: ${type};`)
          .join("\n")}`
      : ""
  }
}`;
}

const FeatureTypeToFunctionName: Record<FeatureType, string> = {
  [FeatureType.Computed]: "getFeature",
  [FeatureType.Entity]: "getEntityId",
  [FeatureType.Count]: "shouldCount",
  [FeatureType.UniqueCount]: "shouldCount",
  [FeatureType.Rule]: "getRule",
};

interface CompileStatusIndicatorProps {
  compileStatus: {
    status: "empty" | "compiling" | "success" | "error";
    message?: string;
    code?: string;
  };
}

function CompileStatusIndicator(props: CompileStatusIndicatorProps) {
  const { compileStatus } = props;

  if (compileStatus.status === "compiling") {
    return (
      <div className="flex items-center gap-1 text-xs">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{compileStatus.message}</span>
      </div>
    );
  } else if (compileStatus.status === "error") {
    return (
      <div className="flex items-center gap-1 text-xs text-red-600">
        <XIcon className="h-4 w-4 " />
        <span>{"Compilation error"}</span>
      </div>
    );
  } else if (compileStatus.status === "success") {
    return (
      <div className="flex items-center gap-1 text-xs text-lime-400">
        <CheckIcon className="h-4 w-4" />
        <span>{compileStatus.message}</span>
      </div>
    );
  } else {
    return null;
  }
}

export { EditComputed };

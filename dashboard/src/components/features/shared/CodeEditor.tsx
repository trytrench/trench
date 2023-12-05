import { FeatureDef } from "event-processing";
import { CheckIcon, Loader2, Settings, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Diagnostic, Project, ts } from "ts-morph";
import { MonacoEditor } from "~/components/ts-editor/MonacoEditor";
import { COMPILER_OPTIONS } from "~/components/ts-editor/compilerOptions";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { toast } from "~/components/ui/use-toast";

export type CompileStatus = {
  status: "empty" | "compiling" | "success" | "error";
  message?: string;
  code?: string;
  compiled?: string;
  diagnostics?: Diagnostic<ts.Diagnostic>[];
};

interface CodeEditorProps {
  prefix?: string;
  suffix?: string;
  initialCode?: string;
  libSource?: string;
  onCompileStatusChange?: (Status: CompileStatus) => void;
}

function CodeEditor(props: CodeEditorProps) {
  const { prefix, suffix } = props;
  const { onCompileStatusChange } = props;

  console.log("REREnder");

  // note:
  // - The monaco editor is not used as a controlled component
  const [code, setCode] = useState("");

  const [compileStatus, setCompileStatus] = useState<CompileStatus>({
    status: "empty",
  });

  const compile = useCallback(() => {
    setCompileStatus({
      status: "compiling",
      message: "Compiling...",
    });

    // Assemble and compile the code

    const LIB_SOURCE = `
    type TrenchEvent = {
      type: string;
      timestamp: Date;
      data: any;
    };`;

    const finalCode = [prefix, code, suffix, LIB_SOURCE].join("\n");

    const project = new Project({
      useInMemoryFileSystem: true,
      compilerOptions: COMPILER_OPTIONS,
    });

    project.createSourceFile("main.ts", finalCode);

    const allDiagnostics = project.getPreEmitDiagnostics();

    // Set compile status based on results

    if (!allDiagnostics.length) {
      const transpiledOutput = ts.transpileModule(finalCode, {
        compilerOptions: {
          ...COMPILER_OPTIONS,
        },
      });

      setCompileStatus({
        status: "success" as const,
        message: "Compiled successfully",
        code: code,
        compiled: transpiledOutput.outputText,
      });
    } else {
      const lineNum = allDiagnostics[0]?.getLineNumber();
      toast({
        variant: "destructive",
        title: lineNum ? `Error in line ${lineNum}` : "Compile error",
        description: allDiagnostics[0]?.getMessageText().toString(),
      });

      setCompileStatus({
        status: "error" as const,
        message: "There was an error compiling your code",
        diagnostics: allDiagnostics,
      });
    }
  }, [code, prefix, setCompileStatus, suffix]);

  useEffect(() => {
    onCompileStatusChange?.(compileStatus);
  }, [compileStatus, onCompileStatusChange]);

  return (
    <>
      <div className="flex flex-col gap-2 mb-4">
        <Label className="text-emphasis-foreground text-md">Code</Label>
      </div>

      <div className="flex mb-2 gap-4">
        <Button variant="outline" className="gap-1.5" onClick={compile}>
          <Settings className="w-4 h-4" />
          Compile
        </Button>
        <CompileStatusMessage compileStatus={compileStatus} />
      </div>

      <div className="h-96">
        <MonacoEditor
          prefix={prefix}
          suffix={suffix}
          value={props.initialCode ?? ""}
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

interface CompileStatusMessageProps {
  compileStatus: CompileStatus;
}

function CompileStatusMessage(props: CompileStatusMessageProps) {
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

export { CodeEditor };

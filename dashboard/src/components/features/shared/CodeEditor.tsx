import { CheckIcon, Loader2, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Diagnostic, Project, ts } from "ts-morph";
import { MonacoEditor } from "~/components/ts-editor/MonacoEditor";
import { COMPILER_OPTIONS } from "~/components/ts-editor/compilerOptions";
import { Label } from "~/components/ui/label";
import { useDebounce } from "~/hooks/useDebounce";

export type CompileStatus =
  | {
      status: "empty";
    }
  | {
      status: "compiling";
      message: string;
    }
  | {
      status: "success";
      message: string;
      code: string;
      compiled: string;
    }
  | {
      status: "error";
      message: string;
      diagnostics: Diagnostic<ts.Diagnostic>[];
    };

interface CodeEditorProps {
  prefix?: string;
  suffix?: string;
  initialCode?: string;
  libSource?: string;
  onCompileStatusChange: (Status: CompileStatus) => void;
}

function CodeEditor({
  prefix,
  suffix,
  initialCode,
  libSource,
  onCompileStatusChange,
}: CodeEditorProps) {
  // note:
  // - The monaco editor is not used as a controlled component
  const [code, setCode] = useState("");
  const debouncedCode = useDebounce(code, 1000);

  const [compileStatus, setCompileStatus] = useState<CompileStatus>({
    status: "empty",
  });

  useEffect(() => {
    onCompileStatusChange(compileStatus);
  }, [onCompileStatusChange, compileStatus]);

  const compile = useCallback(
    (code: string) => {
      console.log("compiling");
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
          code,
          compiled: transpiledOutput.outputText,
        });
      } else {
        // const lineNum = allDiagnostics[0]?.getLineNumber();
        // toast({
        //   variant: "destructive",
        //   title: lineNum ? `Error in line ${lineNum}` : "Compile error",
        //   description: allDiagnostics[0]?.getMessageText().toString(),
        // });

        setCompileStatus({
          status: "error" as const,
          message: "There was an error compiling your code",
          diagnostics: allDiagnostics,
        });
      }
    },
    [setCompileStatus, prefix, suffix]
  );

  useEffect(() => {
    if (debouncedCode.trim()) compile(debouncedCode);
  }, [debouncedCode, compile]);

  return (
    <>
      <div className="flex mb-4 justify-between">
        <Label className="text-emphasis-foreground text-md">Code</Label>
        {code.trim() && <CompileStatusMessage compileStatus={compileStatus} />}
      </div>

      <div className="h-96">
        <MonacoEditor
          prefix={prefix}
          suffix={suffix}
          value={initialCode ?? ""}
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

  if (compileStatus.status === "empty") {
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
      <div className="flex items-center gap-1 text-xs text-green-500">
        <CheckIcon className="h-4 w-4" />
        <span>{compileStatus.message}</span>
      </div>
    );
  } else {
    return null;
  }
}

export { CodeEditor };

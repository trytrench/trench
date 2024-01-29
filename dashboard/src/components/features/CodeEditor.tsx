import { Editor, useMonaco } from "@monaco-editor/react";
import { CheckIcon, Loader2, XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Diagnostic, Project, ts } from "ts-morph";
import { COMPILER_OPTIONS } from "~/components/ts-editor/compilerOptions";
import { useDebounce } from "~/hooks/useDebounce";

export type CompileStatus =
  | {
      status: "empty";
      code: string;
    }
  | {
      status: "compiling";
      message: string;
      code: string;
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
      code: string;
    };

interface CodeEditorProps {
  initialCode?: string;
  typeDefs: string;
  onCompileStatusChange: (Status: CompileStatus) => void;
}

function CodeEditor({
  initialCode,
  onCompileStatusChange,
  typeDefs,
}: CodeEditorProps) {
  // note:
  // - The monaco editor is not used as a controlled component
  const [code, setCode] = useState(initialCode ?? "");
  const debouncedCode = useDebounce(code, 1000);

  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "vs-dark" : "vs-light";

  const monaco = useMonaco();

  useEffect(() => {
    monaco?.languages.typescript.typescriptDefaults.addExtraLib(typeDefs, "");
  }, [monaco, typeDefs]);

  const compile = useCallback(
    (code: string) => {
      onCompileStatusChange({
        status: "compiling",
        message: "Compiling...",
        code,
      });

      // Assemble and compile the code

      const finalCode = [code, typeDefs].join("\n");

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

        onCompileStatusChange({
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

        onCompileStatusChange({
          status: "error" as const,
          message: "There was an error compiling your code",
          diagnostics: allDiagnostics,
          code,
        });
      }
    },
    [onCompileStatusChange, typeDefs]
  );

  useEffect(() => {
    if (debouncedCode.trim()) compile(debouncedCode);
  }, [debouncedCode, compile]);

  return (
    <Editor
      theme={theme}
      defaultLanguage="typescript"
      defaultValue={initialCode}
      onChange={(value) => setCode(value)}
    />
  );
}

interface CompileStatusMessageProps {
  compileStatus: CompileStatus;
}

export function CompileStatusMessage(props: CompileStatusMessageProps) {
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

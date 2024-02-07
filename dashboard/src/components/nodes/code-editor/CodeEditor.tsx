import { Editor, useMonaco } from "@monaco-editor/react";
import { CheckIcon, Loader2, XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Diagnostic, Project, ts } from "ts-morph";
import { useThrottle } from "../../../hooks/useThrottle";
import { type CompileStatus, compileStatusAtom, tsCodeAtom } from "./state";
import { useAtom } from "jotai";
import { compileTs } from "event-processing/src/function-type-defs/types/Computed";

interface CodeEditorProps {
  typeDefs: string;
}

function CodeEditor({ typeDefs }: CodeEditorProps) {
  // note:
  // - The monaco editor is not used as a controlled component
  const [code, setCode] = useAtom(tsCodeAtom);
  const debouncedCode = useThrottle(code, 1000);

  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "vs-dark" : "vs-light";

  const [, setCompileStatus] = useAtom(compileStatusAtom);
  const monaco = useMonaco();

  useEffect(() => {
    console.log(monaco?.languages.typescript.typescriptDefaults.getExtraLibs());
    monaco?.languages.typescript.typescriptDefaults.setExtraLibs([
      { content: typeDefs, filePath: "types.ts" },
    ]);
  }, [monaco, typeDefs]);

  const compile = useCallback(
    (code: string) => {
      console.log("Compiling.");
      setCompileStatus({
        status: "compiling",
        message: "Compiling...",
      });

      // Assemble and compile the code

      const result = compileTs({ code, typeDefs });

      // Set compile status based on results

      if (result.success === true) {
        setCompileStatus({
          status: "success" as const,
          message: "Compiled successfully",
          code,
          compiled: result.compiledJs,
          inferredSchema: result.inferredSchema,
        });
      } else {
        const allDiagnostics = result.diagnostics;

        setCompileStatus({
          status: "error" as const,
          message: "There was an error compiling your code",
          diagnostics: allDiagnostics,
          inferredSchema: result.inferredSchema,
        });
      }
    },
    [setCompileStatus, typeDefs]
  );

  useEffect(() => {
    if (debouncedCode.trim()) compile(debouncedCode);
  }, [debouncedCode, compile]);

  return (
    <Editor
      theme={theme}
      value={code}
      defaultLanguage="typescript"
      onChange={(value) => setCode(value ?? "")}
    />
  );
}

interface CompileStatusMessageProps {
  compileStatus: CompileStatus;
}

export function CompileStatusMessage(props: CompileStatusMessageProps) {
  const { compileStatus } = props;

  if (compileStatus.status === "empty") {
    //   return null;
    // } else if (compileStatus.status === "compiling") {
    return (
      <div className="flex items-center gap-1 text-xs">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
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

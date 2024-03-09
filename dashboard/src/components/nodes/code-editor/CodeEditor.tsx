import { Editor, Monaco, useMonaco } from "@monaco-editor/react";
import { CheckIcon, Loader2, XIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useRef } from "react";
import { useThrottle } from "../../../hooks/useThrottle";
import { type CompileStatus, compileStatusAtom, tsCodeAtom } from "./state";
import { useAtom } from "jotai";
import {
  TS_COMPILER_OPTIONS,
  type CompileTsResult,
} from "event-processing/src/function-type-defs/types/Computed";
import { handleError } from "../../../lib/handleError";
import { editor } from "monaco-editor";

interface CodeEditorProps {
  typeDefs: string;
}

function CodeEditor({ typeDefs }: CodeEditorProps) {
  // note:
  // - The monaco editor is not used as a controlled component
  const [code, setCode] = useAtom(tsCodeAtom);
  const debouncedCode = useThrottle(code, 300);

  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "vs-dark" : "vs-light";

  const [, setCompileStatus] = useAtom(compileStatusAtom);
  const monaco = useMonaco();

  useEffect(() => {
    monaco?.languages.typescript.typescriptDefaults.setExtraLibs([
      { content: typeDefs, filePath: "types.ts" },
    ]);
  }, [monaco, typeDefs]);

  const compileControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Cancel any ongoing compilation when the code or typeDefs change
    if (compileControllerRef.current) {
      compileControllerRef.current.abort();
    }
  }, [code, typeDefs]);

  const compile = useCallback(
    async (code: string, cancellationToken: AbortSignal) => {
      setCompileStatus({
        status: "compiling",
        message: "Compiling...",
      });

      try {
        // Assemble and compile the code
        const result = await compileWithWorker(
          { code, typeDefs },
          cancellationToken
        );

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
          setCompileStatus({
            status: "error" as const,
            message: "There was an error compiling your code",
            errors: result.errors,
            inferredSchema: result.inferredSchema,
          });
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.name !== "AbortError") {
            // Handle non-abort errors
            handleError(error);
          }
        }
      }
    },
    [setCompileStatus, typeDefs]
  );

  useEffect(() => {
    if (debouncedCode.trim()) {
      // Create a new AbortController for this compilation
      const controller = new AbortController();
      compileControllerRef.current = controller;

      compile(debouncedCode, controller.signal).catch(handleError);
    }
  }, [debouncedCode, compile]);

  const handleMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        TS_COMPILER_OPTIONS
      );
    },
    []
  );

  return (
    <Editor
      theme={theme}
      value={code}
      defaultLanguage="typescript"
      onChange={(value) => setCode(value ?? "")}
      onMount={handleMount}
    />
  );
}

interface CompileStatusMessageProps {
  compileStatus: CompileStatus;
}

export function CompileStatusMessage(props: CompileStatusMessageProps) {
  const { compileStatus } = props;

  if (
    compileStatus.status === "empty" ||
    compileStatus.status === "compiling"
  ) {
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

// Create a function that encapsulates the communication with the web worker
function compileWithWorker(
  inputs: {
    code: string;
    typeDefs: string;
  },
  cancellationToken: AbortSignal
): Promise<CompileTsResult> {
  return new Promise((resolve, reject) => {
    const errorCheckerWorker: Worker = new Worker(
      new URL("./compilerWorker", import.meta.url)
    );

    // Listen for messages from the web worker
    errorCheckerWorker.onmessage = function (event: MessageEvent) {
      // Resolve the promise with the errors received from the web worker
      resolve(event.data as CompileTsResult);
      // Terminate the web worker
      errorCheckerWorker.terminate();
    };

    // Handle any errors or termination of the web worker
    errorCheckerWorker.onerror = function (error: ErrorEvent) {
      // Reject the promise with the error
      reject(error);
    };

    errorCheckerWorker.onmessageerror = function (error: MessageEvent) {
      // Reject the promise with the error
      reject(error);
    };

    // Listen for the abort event on the AbortSignal
    cancellationToken.onabort = function () {
      // Terminate the web worker if it's still running
      errorCheckerWorker.terminate();
      // Reject the promise with an AbortError
      reject(new DOMException("The operation was aborted", "AbortError"));
    };

    // Send the nodeDefs array to the web worker
    errorCheckerWorker.postMessage(inputs);
  });
}

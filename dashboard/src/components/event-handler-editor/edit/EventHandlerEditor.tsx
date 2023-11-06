import { FolderOpen, History, PlusCircleIcon } from "lucide-react";
import type { editor } from "monaco-editor";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SqrlAstError } from "sqrl";
import {
  compileSqrl,
  createSqrlInstance,
  hashEventHandler,
} from "sqrl-helpers";
import { FileListItem } from "~/components/FileListItem";
import { MonacoEditor } from "~/components/sqrl-editor/MonacoEditor";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { handleError } from "../../../lib/handleError";
import { usePrevious } from "react-use";
import {
  compileStatusAtom,
  editorStateAtom,
} from "../../../global-state/editor";
import { useAtom } from "jotai";
import { Separator } from "../../ui/separator";
import { CompileStatusIndicator } from "./CompileStatusIndicator";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { EventHandlersSidebar } from "./EventHandlersSidebar";
import { Tooltip, TooltipProvider, TooltipTrigger } from "../../ui/tooltip";
import { SaveDialog } from "./SaveDialog";

export type EventHandlerDef = {
  code: Record<string, string>;
};

export const EventHandlerEditor = () => {
  const [editorState, setEditorState] = useAtom(editorStateAtom);
  const [compileStatus, setCompileStatus] = useAtom(compileStatusAtom);

  // const hasUnsavedChanges = useMemo(
  //   () =>
  //     Object.keys(initialCode).some(
  //       (file) => initialCode[file] !== editorState[file]
  //     ),
  //   [initialCode, editorState]
  // );
  // useConfirmPageLeave(hasUnsavedChanges, UNSAVED_CHANGES_MESSAGE);

  const [_currentFileName, setCurrentFileName] = useState<string>("");
  const currentFileName = useMemo(() => {
    const filenames = Object.keys(editorState.code);
    if (filenames.includes(_currentFileName)) return _currentFileName;
    return Object.keys(editorState.code)[0] ?? "";
  }, [editorState, _currentFileName]);

  const recompile = useCallback(async () => {
    setCompileStatus({ status: "compiling", message: "Recompiling…" });

    const instance = await createSqrlInstance({
      config: {
        "state.allow-in-memory": true,
      },
    });

    try {
      const { compiled, spec } = await compileSqrl(instance, editorState.code);
      setCompileStatus({
        status: "success",
        message: "Compiled successfully",
        compiledExecutable: compiled,
        codeHash: hashEventHandler({ code: editorState.code }),
        code: editorState.code,
      });
    } catch (error) {
      if (error instanceof SqrlAstError) {
        setCompileStatus({
          status: "error",
          message: error.message,
          errorMarker: error.location
            ? {
                filename: error.location.filename ?? "unknown file",
                message: error.message,
                severity: 8,
                startColumn: error.location.start.column,
                endColumn: error.location.end.column,
                startLineNumber: error.location.start.line,
                endLineNumber: error.location.start.line,
              }
            : undefined,
        });
      } else {
        setCompileStatus({
          status: "error",
          message: (error as Error).message,
        });
      }
    }
  }, [editorState, setCompileStatus]);

  const previousCode = usePrevious(editorState.code);
  useEffect(() => {
    if (editorState.code !== previousCode) {
      recompile().catch(handleError);
    }
  }, [editorState, previousCode, recompile]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-4">
        <Tabs defaultValue="edit">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center">
          <CompileStatusIndicator />
          {/* <RenderCodeHash
            hashHex={
              compileStatus.status === "success" ? compileStatus.codeHash : ""
            }
          /> */}

          <EventHandlersSidebar />
          <div className="w-2 shrink-0"></div>

          {/* <Button size="xs" variant="outline" className="ml-6">
            <FolderOpen className="h-4 w-4 mr-1" /> Load
          </Button> */}
          <SaveDialog />
        </div>
      </div>
      <Separator />

      <div className="flex flex-1 overflow-auto">
        <div className="w-72 shrink-0">
          <div>
            <div className="flex space-x-2">
              <Input type="search" placeholder="Search" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setEditorState({
                    ...editorState,
                    [`Untitled-${Object.keys(editorState).length}.sqrl`]: "",
                  });
                }}
              >
                <PlusCircleIcon className="h-4 w-4" />
              </Button>
            </div>

            {Object.keys(editorState.code).map((filename, index) => (
              <FileListItem
                key={index}
                active={currentFileName === filename}
                onClick={() => {
                  setCurrentFileName(filename);
                }}
                onRename={(newFilename) => {
                  setEditorState((prev) => {
                    const oldFileContent = prev.code[filename];
                    if (!oldFileContent) {
                      return prev;
                    }

                    prev.code[newFilename] = oldFileContent;
                    delete prev.code[filename];
                    return prev;
                  });
                }}
                name={filename}
                onDelete={() => {
                  setEditorState((prev) => {
                    delete prev.code[filename];
                    return prev;
                  });
                }}
                hasError={
                  compileStatus.status === "error" &&
                  compileStatus.errorMarker?.filename === filename
                }
                hasUnsavedChanges={false}
              />
            ))}
          </div>
        </div>

        <MonacoEditor
          className="flex-1 w-full"
          key={currentFileName}
          value={editorState.code[currentFileName] ?? ""}
          markers={
            compileStatus.status === "error" && compileStatus.errorMarker
              ? [compileStatus.errorMarker]
              : undefined
          }
          sqrlFunctions={null}
          onChange={(newSource) => {
            setEditorState((prev) => ({
              ...prev,
              code: {
                ...prev.code,
                [currentFileName]: newSource,
              },
            }));
          }}
          options={MONACO_OPTIONS}
          // readOnly={!isEditing}
        />
      </div>
    </div>
  );
};

const MONACO_OPTIONS = {
  // automaticLayout: true,
  padding: { top: 16 },
  fontSize: 14,
};

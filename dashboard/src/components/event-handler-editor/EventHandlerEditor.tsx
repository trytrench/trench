import {
  FileText,
  FolderOpen,
  History,
  InfoIcon,
  PlusCircleIcon,
  Save,
} from "lucide-react";
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
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { handleError } from "../../lib/handleError";
import { usePrevious } from "react-use";
import { compileStatusAtom, editorStateAtom } from "../../global-state/editor";
import { useAtom } from "jotai";
import { Separator } from "../ui/separator";
import { CompileStatusIndicator } from "./CompileStatusIndicator";
import { RenderCodeHash } from "./RenderCodeHash";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { EventHandlersSidebar } from "./EventHandlersSidebar";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Tooltip, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { api } from "../../utils/api";
import { useProject } from "../../hooks/useProject";
import { toast } from "../ui/use-toast";

export type EventHandlerDef = {
  code: Record<string, string>;
};

function SaveDialog() {
  const { data: project } = useProject();
  const [editorState, setEditorState] = useAtom(editorStateAtom);

  const [compileStatus, setCompileStatus] = useAtom(compileStatusAtom);

  const [message, setMessage] = useState<string>("");

  const { mutateAsync: createEventHandler } =
    api.eventHandlers.create.useMutation({});

  const triggerDisabled = compileStatus.status !== "success";

  return (
    <Dialog>
      <DialogTrigger disabled={triggerDisabled}>
        <Button disabled={triggerDisabled}>
          <Save className="h-4 w-4 mr-1.5" />
          Save Snapshot
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save code snapshot</DialogTitle>
          <DialogDescription>
            Save a snapshot of your current code for testing or publishing.
          </DialogDescription>
        </DialogHeader>
        <div>
          <div className="flex items-center">
            <FileText className="h-3.5 w-3.5 mr-0.5 mb-0.5 text-muted-foreground" />
            <RenderCodeHash
              hashHex={
                compileStatus.status === "success" ? compileStatus.codeHash : ""
              }
            />
            <Popover>
              <PopoverTrigger>
                <InfoIcon className="h-3.5 w-3.5 ml-2" />
              </PopoverTrigger>
              <PopoverContent side="top" className="w-auto">
                Used to help identify your code.
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center mt-2">
            <Input
              placeholder="Message describing code (required)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="">
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={!message}
            onClick={() => {
              if (!project) {
                toast({ title: "Please select a project" });
                return;
              }

              if (compileStatus.status !== "success") {
                toast({ title: "No compiled code" });
                return;
              }

              if (!message) {
                toast({ title: "Please enter a message" });
                return;
              }

              createEventHandler({
                projectId: project.id,
                code: compileStatus.code,
                message,
              })
                .then(() => {
                  toast({ title: "Saved" });
                })
                .catch(handleError);
            }}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>

      <DialogFooter></DialogFooter>
    </Dialog>
  );
}

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
    <>
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

      <div className="flex h-full w-full">
        <div className="w-72">
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
    </>
  );
};

const MONACO_OPTIONS = {
  // automaticLayout: true,
  padding: { top: 16 },
  fontSize: 14,
};

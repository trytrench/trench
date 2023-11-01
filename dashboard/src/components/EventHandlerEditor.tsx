import { useToast } from "~/components/ui/use-toast";

import { ClassNames } from "@emotion/react";
import {
  CheckIcon,
  HistoryIcon,
  Loader2,
  MoreHorizontalIcon,
  PlusCircleIcon,
  TagIcon,
  XIcon,
} from "lucide-react";
import type { editor } from "monaco-editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SqrlAstError } from "sqrl";
import { compileSqrl, createSqrlInstance } from "sqrl-helpers";
import { FileListItem } from "~/components/FileListItem";
import {
  MonacoEditor,
  type FunctionInfoMap,
} from "~/components/sqrl-editor/MonacoEditor";
import { useConfirmPageLeave } from "~/hooks/useBeforeUnload";
import { api } from "~/utils/api";
import BackfillModal from "./BackfillModal";
import { PublishModal } from "./PublishModal";
import { EventHandlersSidebar } from "./EventHandlersSidebar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useRouter } from "next/router";
import { type EventHandler } from "@prisma/client";
import { handleError } from "../lib/handleError";
import { usePrevious } from "react-use";
// import { sortBy } from "lodash";

interface Props {
  initialEventHandler: EventHandler;
  onPreviewEventHandler: (eventHandler: EventHandler) => void;
}

const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes, are you sure you want to leave?";

export const EventHandlerEditor = ({
  initialEventHandler,
  onPreviewEventHandler: onPreviewEventHandler,
}: Props) => {
  const router = useRouter();

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );

  // const { mutateAsync: createBacktest } = api.backtests.create.useMutation();
  const { mutateAsync: createRelease } = api.eventHandlers.create.useMutation();
  // const { mutateAsync: publish } = api.eventHandlers.publish.useMutation();
  const { data: eventHandlers, refetch: refetchEventHandlers } =
    api.eventHandlers.list.useQuery();

  const [compileStatus, setCompileStatus] = useState<{
    status: "error" | "success" | "pending";
    message: string;
    errorMarker?: editor.IMarkerData & {
      filename: string;
    };
  }>({ status: "pending", message: "Requesting initial compilation…" });

  const [isEditing, setIsEditing] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [backfillModalOpen, setBackfillModalOpen] = useState(false);

  // const { toast } = useToast();

  const initialCode = useMemo(
    () => initialEventHandler.code as Record<string, string>,
    [initialEventHandler]
  );
  const [code, setCode] = useState(initialCode);
  const previousCode = usePrevious(code);

  useEffect(() => {
    setCode(initialCode);
    setCurrentFileName(Object.keys(initialCode)[0] ?? "");
  }, [initialCode]);

  const hasUnsavedChanges = useMemo(
    () =>
      Object.keys(initialCode).some((file) => initialCode[file] !== code[file]),
    [initialCode, code]
  );
  useConfirmPageLeave(hasUnsavedChanges, UNSAVED_CHANGES_MESSAGE);

  const [currentFileName, setCurrentFileName] = useState<string>(
    Object.keys(initialCode)[0] ?? ""
  );

  const recompile = useCallback(async () => {
    setCompileStatus({ status: "pending", message: "Recompiling…" });

    const instance = await createSqrlInstance({
      config: {
        "state.allow-in-memory": true,
      },
    });

    try {
      await compileSqrl(instance, code);
      setCompileStatus({
        status: "success",
        message: "Compiled successfully",
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
  }, [code]);

  useEffect(() => {
    if (code !== previousCode) {
      recompile().catch(handleError);
    }
  }, [code, previousCode, recompile]);

  return (
    <>
      <div className="flex h-full">
        <BackfillModal
          isOpen={backfillModalOpen}
          onOpenChange={setBackfillModalOpen}
          onConfirm={(dateRange) => {
            // createBacktest({
            //   name: "test",
            //   description: "test",
            //   backfillFrom: dateRange.from,
            //   backfillTo: dateRange.to,
            //   rules: files,
            // })
            //   .then(() => {
            //     toast({ title: "success", description: "Dataset created" });
            //     setBackfillModalOpen(false);
            //   })
            //   .catch((error) => {
            //     toast({ title: "error", description: error.message });
            //   });
          }}
        />

        <EventHandlersSidebar
          eventHandlers={eventHandlers ?? []}
          onPreviewEventHandler={onPreviewEventHandler}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
        />

        <div className="w-72">
          <div>
            <div className="flex space-x-2">
              <Input type="search" placeholder="Search" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setCode({
                    ...code,
                    [`Untitled-${Object.keys(code).length}.sqrl`]: "",
                  });
                }}
              >
                <PlusCircleIcon className="h-4 w-4" />
              </Button>
            </div>

            {Object.keys(code).map((filename, index) => (
              <FileListItem
                key={index}
                active={currentFileName === filename}
                onClick={() => {
                  setCurrentFileName(filename);
                }}
                onRename={(newFilename) => {
                  setCode((prev) => {
                    const oldFileContent = prev[filename];
                    if (!oldFileContent) {
                      return prev;
                    }

                    prev[newFilename] = oldFileContent;
                    delete prev[filename];
                    return prev;
                  });
                }}
                name={filename}
                onDelete={() => {
                  setCode((prev) => {
                    delete prev[filename];
                    return prev;
                  });
                }}
                hasError={compileStatus.errorMarker?.filename === filename}
                hasUnsavedChanges={code[filename] !== initialCode[filename]}
              />
            ))}
          </div>
        </div>

        <div className="flex-1">
          <div className="flex justify-end items-center h-11">
            {isEditing ? (
              <>
                <div className="mr-2">
                  {compileStatus.status === "pending" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : compileStatus.status === "error" ? (
                    <XIcon className="w-4 h-4" />
                  ) : compileStatus.status === "success" ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : null}
                </div>

                <Button
                  size="sm"
                  className="mr-2"
                  onClick={() => {
                    setCode(initialCode);
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <PublishModal
                  onPublish={(version, description) => {
                    // publish({
                    //   version,
                    //   description,
                    //   code: sources,
                    //   projectId: project?.id,
                    // })
                    //   .then(() => {
                    //     setIsEditing(false);
                    //     refetchReleases();
                    //     toast({
                    //       title: "Success",
                    //       description: "Release Created",
                    //     });
                    //   })
                    //   .catch((error) => {
                    //     toast({ title: "Error", description: error.message });
                    //   });
                  }}
                  initialVersion={initialEventHandler.version}
                  button={<Button>Publish</Button>}
                />
              </>
            ) : (
              <>
                <Button>
                  <TagIcon className="mr-2 w-4 h-4" />v
                  {initialEventHandler.version}
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={() => {
                    setBackfillModalOpen(true);
                  }}
                >
                  Test
                </Button>
                <Button
                  // size="sm"
                  // colorScheme="blue"
                  onClick={() => setIsEditing(true)}
                >
                  Edit
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setSidebarOpen(true);
                  }}
                >
                  <HistoryIcon className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost">
                  <MoreHorizontalIcon className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          <ClassNames>
            {({ css }) => (
              <MonacoEditor
                className={css({ height: "100%", width: "100%" })}
                key={currentFileName + isEditing}
                value={code[currentFileName] ?? ""}
                markers={
                  compileStatus.errorMarker
                    ? [compileStatus.errorMarker]
                    : undefined
                }
                sqrlFunctions={null}
                onChange={(newSource) => {
                  setCode((prev) => ({
                    ...prev,
                    [currentFileName]: newSource,
                  }));
                }}
                options={{
                  automaticLayout: true,
                  padding: { top: 16 },
                  fontSize: 14,
                }}
                readOnly={!isEditing}
              />
            )}
          </ClassNames>
        </div>
      </div>
    </>
  );
};

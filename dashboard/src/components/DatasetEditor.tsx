import { useDisclosure, useToast } from "@chakra-ui/react";
import { ClassNames } from "@emotion/react";
import { type Release } from "@prisma/client";
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
import { ReleasesSidebar } from "./ReleasesSidebar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useRouter } from "next/router";
// import { sortBy } from "lodash";

interface Props {
  release: Release;
  onPreviewRelease: (release: Release) => void;
}

const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes, are you sure you want to leave?";

export const DatasetEditor = ({ release, onPreviewRelease }: Props) => {
  const router = useRouter();

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.projectName as string },
    { enabled: !!router.query.projectName }
  );

  const { mutateAsync: createDataset } = api.datasets.create.useMutation();
  const { mutateAsync: createRelease } = api.releases.create.useMutation();
  const { data: releases, refetch: refetchReleases } =
    api.releases.list.useQuery();

  const lastSourcesRef = useRef();
  const [compileStatus, setCompileStatus] = useState<{
    status: "error" | "success" | "pending";
    message: string;
    errorMarker?: editor.IMarkerData;
  }>({ status: "pending", message: "Requesting initial compilation…" });

  const [isEditing, setIsEditing] = useState(false);

  const {
    isOpen: isDrawerOpen,
    onClose: onDrawerClose,
    onOpen: onDrawerOpen,
  } = useDisclosure();
  const {
    isOpen: isBackfillModalOpen,
    onClose: onBackfillModalClose,
    onOpen: onBackfillModalOpen,
  } = useDisclosure();
  const {
    isOpen: isPublishModalOpen,
    onClose: onPublishModalClose,
    onOpen: onPublishModalOpen,
  } = useDisclosure();
  // const btnRef = useRef();

  const toast = useToast();

  const files = useMemo(
    () => release.code as Record<string, string>,
    [release]
  );
  const [sources, setSources] = useState(files);

  useEffect(() => {
    setSources(files);
    setCurrentFileName(Object.keys(files)[0] ?? "");
  }, [files]);

  const hasUnsavedChanges = useMemo(
    () => Object.keys(files).some((file) => files[file] !== sources[file]),
    [files, sources]
  );
  useConfirmPageLeave(hasUnsavedChanges, UNSAVED_CHANGES_MESSAGE);

  const [currentFileName, setCurrentFileName] = useState<string>(
    Object.keys(files)[0] ?? ""
  );

  const [sqrlFunctions, setFunctions] = useState<FunctionInfoMap | null>(null);

  const recompile = useCallback(async () => {
    setCompileStatus({ status: "pending", message: "Recompiling…" });

    const instance = await createSqrlInstance({
      config: {
        "state.allow-in-memory": true,
      },
    });

    try {
      await compileSqrl(instance, sources);
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
                fileName: error.location.filename,
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
          message: error.message,
        });
      }
    }

    lastSourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    if (lastSourcesRef.current !== sources) {
      recompile();
    }
  }, [sources, recompile]);

  return (
    <>
      <div className="flex h-full">
        <BackfillModal
          isOpen={isBackfillModalOpen}
          onClose={onBackfillModalClose}
          onConfirm={(dateRange) => {
            createDataset({
              name: "test",
              description: "test",
              backfillFrom: dateRange.from,
              backfillTo: dateRange.to,
              rules: files,
            })
              .then(() => {
                toast({ title: "Dataset created", status: "success" });
                onBackfillModalClose();
              })
              .catch((error) => {
                toast({ title: error.message, status: "error" });
              });
          }}
        />

        <div className="w-72">
          <div>
            <div className="flex space-x-2">
              <Input type="search" placeholder="Search" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setSources({
                    ...sources,
                    [`Untitled-${Object.keys(sources).length}.sqrl`]: "",
                  });
                }}
              >
                <PlusCircleIcon className="h-4 w-4" />
              </Button>
            </div>

            {Object.keys(sources).map((source, index) => (
              <FileListItem
                key={index}
                active={currentFileName === source}
                onClick={() => {
                  setCurrentFileName(source);
                }}
                onRename={(name) => {
                  const newSources = { ...sources };
                  newSources[name] = sources[source];
                  delete newSources[source];
                  setSources(newSources);
                }}
                name={source}
                onDelete={() => {
                  const newSources = { ...sources };
                  delete newSources[source];
                  setSources(newSources);
                }}
                hasError={compileStatus.errorMarker?.fileName === source}
                // hasUnsavedChanges={
                //   file.currentFileSnapshot.code !== sources[file.id]
                // }
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
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <PublishModal
                  onPublish={(version, description) => {
                    createRelease({
                      version,
                      description,
                      code: sources,
                      projectId: project?.id,
                    })
                      .then(() => {
                        setIsEditing(false);
                        refetchReleases();
                        toast({ title: "Release created", status: "success" });
                      })
                      .catch((error) => {
                        toast({ title: error.message, status: "error" });
                      });
                    onPublishModalClose();
                  }}
                  initialVersion={release.version}
                  button={<Button>Publish</Button>}
                />
              </>
            ) : (
              <>
                <Button>
                  <TagIcon className="mr-2 w-4 h-4" />v{release.version}
                </Button>
                <div className="flex-1" />
                <Button
                  onClick={onBackfillModalOpen}
                  size="sm"
                  variant="secondary"
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

                <ReleasesSidebar
                  releases={releases ?? []}
                  onPreviewRelease={onPreviewRelease}
                  button={
                    <Button size="icon" variant="ghost" onClick={onDrawerOpen}>
                      <HistoryIcon className="w-4 h-4" />
                    </Button>
                  }
                />
                <Button size="icon" variant="ghost">
                  <MoreHorizontalIcon className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          <ClassNames>
            {({ css }) => (
              <MonacoEditor
                className={css({
                  height: "100%",
                  width: "100%",
                })}
                key={currentFileName + isEditing}
                value={sources[currentFileName] ?? ""}
                markers={
                  compileStatus.errorMarker
                    ? [compileStatus.errorMarker]
                    : undefined
                }
                sqrlFunctions={sqrlFunctions}
                onChange={(newSource) => {
                  setSources((prev) => ({
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

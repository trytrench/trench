import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Spinner,
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { ClassNames } from "@emotion/react";
import {
  Check,
  History,
  MoreHorizontal,
  PlusCircle,
  Tag,
  X,
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
import { Release } from "@prisma/client";
// import { sortBy } from "lodash";

interface Props {
  release: Release;
  onPreviewRelease: (release: Release) => void;
}

const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes, are you sure you want to leave?";

export const DatasetEditor = ({ release, onPreviewRelease }: Props) => {
  const { mutateAsync: createDataset } = api.datasets.create.useMutation();
  const { mutateAsync: createRelease } = api.releases.create.useMutation();
  const { data: releases } = api.releases.list.useQuery();

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
    setCurrentFileName("");
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
      <Flex h="95vh" gap={6} p={4}>
        <PublishModal
          isOpen={isPublishModalOpen}
          onClose={onPublishModalClose}
          onPublish={(version, description) => {
            createRelease({
              version,
              description,
              code: sources,
              projectId: releases?.[0]?.projectId,
            })
              .then(() => {
                toast({ title: "Release created", status: "success" });
              })
              .catch((error) => {
                toast({ title: error.message, status: "error" });
              });
            onPublishModalClose();
          }}
          initialVersion="0.0.0"
        />

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

        <ReleasesSidebar
          releases={releases ?? []}
          isOpen={isDrawerOpen}
          onClose={onDrawerClose}
          onPreviewRelease={onPreviewRelease}
          // finalFocusRef={btnRef}
        />

        <Box w={200}>
          <VStack
            spacing={2}
            divider={<Box height={"1px"} w={"100%"} bg="gray.200" />}
            borderColor="gray.200"
          >
            <HStack>
              <Input placeholder="Search" size="sm" />
              <IconButton
                size="xs"
                variant="ghost"
                aria-label="Save"
                icon={<Icon as={PlusCircle} fontSize="sm" />}
                onClick={() => {
                  setSources({
                    ...sources,
                    [`Untitled-${Object.keys(sources).length}.sqrl`]: "",
                  });
                }}
              />
            </HStack>
            {Object.keys(sources).map((source) => (
              <FileListItem
                key={source}
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
          </VStack>
        </Box>

        <Box flex={2} overflow={"hidden"}>
          <HStack justify="flex-end" spacing={1} mb={1}>
            {isEditing ? (
              <>
                <Box mr="2">
                  {compileStatus.status === "pending" ? (
                    <Spinner size="sm" speed="0.8s" />
                  ) : compileStatus.status === "error" ? (
                    <Icon fontSize="18" as={X} color="red.500" />
                  ) : compileStatus.status === "success" ? (
                    <Icon fontSize="18" as={Check} color="green.500" />
                  ) : null}
                </Box>

                <Button
                  size="sm"
                  className="mr-2"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={onPublishModalOpen}
                  size="sm"
                  colorScheme="blue"
                  isDisabled={compileStatus.status !== "success"}
                >
                  Create release
                </Button>
              </>
            ) : (
              <>
                <Button leftIcon={<Icon as={Tag} />} mr="auto" size="xs">
                  v{release.version}
                </Button>
                <Button
                  onClick={onBackfillModalOpen}
                  size="sm"

                  // isDisabled={compileStatus.status !== "success"}
                >
                  Test
                </Button>
                <Button
                  size="sm"
                  colorScheme="blue"
                  onClick={() => setIsEditing(true)}
                  // ref={btnRef}
                >
                  Edit
                </Button>
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Releases"
                  icon={<Icon as={History} fontSize="lg" />}
                  onClick={onDrawerOpen}
                  // ref={btnRef}
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="More"
                  icon={<Icon as={MoreHorizontal} fontSize="lg" />}
                />
              </>
            )}
          </HStack>

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
        </Box>
      </Flex>
    </>
  );
};

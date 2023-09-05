import {
  Box,
  Button,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { ClassNames } from "@emotion/react";
import { type File, type FileSnapshot } from "@prisma/client";
import { subDays } from "date-fns";
import { Check, History, MoreHorizontal, PlusCircle, X } from "lucide-react";
import type { editor } from "monaco-editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileListItem } from "~/components/FileListItem";
import { useDebounce } from "~/hooks/useDebounce";
import { compileSqrl } from "~/lib/compileSqrl";
import { createSqrlInstance } from "~/lib/createSqrlInstance";
import { type FunctionInfoMap, MonacoEditor } from "~/components/MonacoEditor";
import { api } from "~/utils/api";
import { PublishModal } from "./PublishModal";
import { RuleEditorSidebar } from "./RuleEditorSidebar";
import { useRouter } from "next/router";
import { useBeforeUnload } from "react-use";
import { sortBy } from "lodash";

interface Props {
  files: (File & { currentFileSnapshot: FileSnapshot })[];
  refetchFiles: () => void;
}

const shouldCompile = (file?: File) => {
  return file?.name.endsWith(".sqrl");
};
const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes, are you sure you want to leave?";

export const RuleEditor = ({ files, refetchFiles }: Props) => {
  const { mutateAsync: createFile } = api.files.create.useMutation();
  const { mutateAsync: deleteFile } = api.files.delete.useMutation();
  const { mutateAsync: renameFile } = api.files.rename.useMutation();
  const { mutateAsync: publishFile } = api.files.publish.useMutation();

  const lastSourceRef = useRef<string>();
  const lastFilesRef = useRef();
  const [compileStatus, setCompileStatus] = useState<{
    status: "error" | "success" | "pending";
    message: string;
    errorMarker?: editor.IMarkerData;
  }>({ status: "pending", message: "Requesting initial compilation…" });

  const [value, setValue] = useState("3days");
  const {
    isOpen: isDrawerOpen,
    onClose: onDrawerClose,
    onOpen: onDrawerOpen,
  } = useDisclosure();
  const {
    isOpen: isModalOpen,
    onClose: onModalClose,
    onOpen: onModalOpen,
  } = useDisclosure();
  const {
    isOpen: isPublishModalOpen,
    onClose: onPublishModalClose,
    onOpen: onPublishModalOpen,
  } = useDisclosure();
  const btnRef = useRef();

  ///////////////////

  const toast = useToast();

  ///////////////////

  const router = useRouter();

  const [sources, setSources] = useState<Record<string, string>>(
    files.reduce((acc, file) => {
      acc[file.id] = file.currentFileSnapshot.code;
      return acc;
    }, {} as Record<string, string>)
  );

  const hasUnsavedChanges = useMemo(
    () =>
      files.some((file) => file.currentFileSnapshot.code !== sources[file.id]),
    [files, sources]
  );
  useBeforeUnload(hasUnsavedChanges, UNSAVED_CHANGES_MESSAGE);
  useEffect(() => {
    const handler = () => {
      if (hasUnsavedChanges && !window.confirm(UNSAVED_CHANGES_MESSAGE)) {
        throw "Route change aborted";
      }
    };
    router.events.on("routeChangeStart", handler);
    return () => {
      router.events.off("routeChangeStart", handler);
    };
  }, [hasUnsavedChanges, router.events]);

  const [currentFileId, setCurrentFileId] = useState<string>(files[0]?.id);

  const source = useMemo<string>(
    () => sources[currentFileId],
    [sources, currentFileId]
  );
  const currentFile = useMemo<
    File & { fileSnapshots: FileSnapshot[]; currentFileSnapshot: FileSnapshot }
  >(
    () => files.find((file) => file.id === currentFileId) || files[0],
    [files, currentFileId]
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
      const fileData =
        files.reduce((acc, file) => {
          acc[file.name] = sources[file.id];
          return acc;
        }, {} as Record<string, string>) || {};

      await compileSqrl(instance, fileData);
      setCompileStatus({
        status: "success",
        message: "Compiled successfully",
      });
    } catch (error) {
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
    }

    lastSourceRef.current = source;
  }, [files, sources, source]);

  const debouncedSource = useDebounce(source, 300);

  useEffect(() => {
    if (lastFilesRef.current !== files) {
      if (shouldCompile(currentFile)) recompile();

      lastFilesRef.current = files;
      setSources(
        files.reduce((acc, file) => {
          acc[file.id] = sources[file.id] || file.currentFileSnapshot.code;
          return acc;
        }, {} as Record<string, string>)
      );
    }
  }, [files, sources, recompile, currentFile]);

  useEffect(() => {
    if (
      lastSourceRef.current !== debouncedSource &&
      shouldCompile(currentFile)
    ) {
      recompile();
    }
  }, [debouncedSource, currentFile, recompile]);

  return (
    <>
      <Flex h="95vh" gap={6} p={4}>
        <PublishModal
          isOpen={isPublishModalOpen}
          onClose={onPublishModalClose}
          onPublish={(version, description) => {
            publishFile({
              id: currentFileId,
              version,
              description,
              code: source,
            })
              .then(() => refetchFiles())
              .catch((error) =>
                toast({ title: error.message, status: "error" })
              );
            onPublishModalClose();
          }}
          initialVersion={currentFile?.currentFileSnapshot.version || "0.0.0"}
        />

        <Modal isOpen={isModalOpen} onClose={onModalClose}>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Test rules</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <Select
                value={value}
                onChange={(event) => setValue(event.target.value)}
              >
                <option value="3days">3 days</option>
                <option value="1week">1 week</option>
                <option value="1month">1 month</option>
              </Select>
            </ModalBody>

            <ModalFooter>
              <Button
                colorScheme="blue"
                mr={1}
                onClick={() => {
                  let startDate = new Date("2023-07-01T00:00:00.000Z");
                  if (value === "3days") {
                    startDate = subDays(startDate, 3);
                  } else if (value === "1week") {
                    startDate = subDays(startDate, 7);
                  } else if (value === "1month") {
                    startDate = subDays(startDate, 30);
                  }

                  init(startDate);
                  onModalClose();
                }}
                size="sm"
              >
                Run test
              </Button>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

        <RuleEditorSidebar
          fileSnapshots={currentFile?.fileSnapshots ?? []}
          isOpen={isDrawerOpen}
          onClose={onDrawerClose}
          finalFocusRef={btnRef}
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
                  createFile({ name: "Untitled" })
                    .then(() => refetchFiles())
                    .catch((error) =>
                      toast({ title: error.message, status: "error" })
                    );
                }}
              />
            </HStack>
            {sortBy(files, (file) => file.createdAt).map((file) => (
              <FileListItem
                key={file.id}
                active={currentFileId === file.id}
                onClick={() => {
                  setCurrentFileId(file.id);
                }}
                onRename={(name) => {
                  renameFile({ id: file.id, name })
                    .then(() => refetchFiles())
                    .catch((error) =>
                      toast({ title: error.message, status: "error" })
                    );
                }}
                name={file.name}
                onDelete={() => {
                  const newSources = { ...sources };
                  delete newSources[file.id];
                  setSources(newSources);

                  deleteFile({ id: file.id })
                    .then(() => refetchFiles())
                    .catch((error) =>
                      toast({ title: error.message, status: "error" })
                    );
                }}
                hasError={compileStatus.errorMarker?.fileName === file.name}
                hasUnsavedChanges={
                  file.currentFileSnapshot.code !== sources[file.id]
                }
              />
            ))}
          </VStack>
        </Box>

        <Box flex={2} overflow={"hidden"}>
          <Tabs h="100%" size="sm">
            <TabList>
              <Tab>Code</Tab>
              <Tab>Logs</Tab>
              <Tab>Results</Tab>
              <HStack ml="auto" spacing={1} mb={1}>
                {shouldCompile(currentFile) ? (
                  <Box mr="2">
                    {compileStatus.status === "pending" ? (
                      <Spinner size="sm" speed="0.8s" />
                    ) : compileStatus.status === "error" ? (
                      <Icon fontSize="18" as={X} color="red.500" />
                    ) : compileStatus.status === "success" ? (
                      <Icon fontSize="18" as={Check} color="green.500" />
                    ) : null}
                  </Box>
                ) : null}

                <Button
                  onClick={onModalOpen}
                  size="sm"
                  isDisabled={compileStatus.status !== "success"}
                >
                  Test
                </Button>
                <Button
                  onClick={onPublishModalOpen}
                  size="sm"
                  colorScheme="blue"
                  isDisabled={
                    (compileStatus.status !== "success" &&
                      shouldCompile(currentFile)) ||
                    currentFile?.currentFileSnapshot.code === source
                  }
                >
                  Publish
                </Button>
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Save"
                  icon={<Icon as={History} fontSize="lg" />}
                  onClick={onDrawerOpen}
                  ref={btnRef}
                />
                <IconButton
                  size="sm"
                  variant="ghost"
                  aria-label="Save"
                  icon={<Icon as={MoreHorizontal} fontSize="lg" />}
                />
              </HStack>
            </TabList>

            <TabPanels h="100%">
              <TabPanel h="100%">
                <ClassNames>
                  {({ css }) => (
                    <MonacoEditor
                      className={css({
                        height: "100%",
                        width: "100%",
                      })}
                      key={currentFileId}
                      value={source || ""}
                      markers={
                        compileStatus.errorMarker
                          ? [compileStatus.errorMarker]
                          : undefined
                      }
                      sqrlFunctions={sqrlFunctions}
                      onChange={(newSource) => {
                        setSources((prev) => ({
                          ...prev,
                          [currentFileId]: newSource,
                        }));
                      }}
                      options={{
                        automaticLayout: true,
                        padding: { top: 16 },
                        fontSize: 14,
                        // scrollbar: { alwaysConsumeMouseWheel: false },
                      }}
                      // isDarkMode={isDarkMode}
                    />
                  )}
                </ClassNames>
              </TabPanel>
              <TabPanel></TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Flex>
    </>
  );
};

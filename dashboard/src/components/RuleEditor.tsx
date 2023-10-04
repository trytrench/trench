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
import {
  Check,
  History,
  MoreHorizontal,
  PlusCircle,
  TextIcon,
  TypeIcon,
  X,
} from "lucide-react";
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
import { analyze } from "~/lib/analyzeSqrl";
import {
  Accordion,
  AccordionList,
  AccordionHeader,
  AccordionBody,
  Badge,
  Card,
  Text,
  Title,
} from "@tremor/react";
import { ScrollArea } from "@radix-ui/react-scroll-area";

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
    files.reduce(
      (acc, file) => {
        acc[file.id] = file.currentFileSnapshot.code;
        return acc;
      },
      {} as Record<string, string>
    )
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

  type AnalysisType = Awaited<ReturnType<typeof analyze>>;
  const [analysis, setAnalysis] = useState<AnalysisType | null>(null);

  const recompile = useCallback(async () => {
    setCompileStatus({ status: "pending", message: "Recompiling…" });

    const instance = await createSqrlInstance({
      config: {
        "state.allow-in-memory": true,
      },
    });

    try {
      const fileData =
        files.reduce(
          (acc, file) => {
            acc[file.name] = sources[file.id];
            return acc;
          },
          {} as Record<string, string>
        ) || {};

      await compileSqrl(instance, fileData);
      setCompileStatus({
        status: "success",
        message: "Compiled successfully",
      });

      const analysis = await analyze(instance, fileData);
      setAnalysis(analysis);
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
        files.reduce(
          (acc, file) => {
            acc[file.id] = sources[file.id] || file.currentFileSnapshot.code;
            return acc;
          },
          {} as Record<string, string>
        )
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
    <Flex flexGrow={1} gap={6} p={4}>
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
            .catch((error) => toast({ title: error.message, status: "error" }));
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
        <Tabs size="sm" display="flex" flexDir="column" height="100%">
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

          <TabPanels flexGrow={1} display="flex">
            <TabPanel
              display="flex"
              flexGrow={1}
              position="relative"
              minH={0}
              padding={0}
            >
              <ClassNames>
                {({ css }) => (
                  <MonacoEditor
                    className={css({
                      width: "70%",
                      height: "100%",
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
              <div className="pl-4 p-1 flex flex-col gap-4 overflow-y-auto h-full relative grow">
                {analysis ? (
                  <div className=" absolute top-0 left-0 bottom-0 right-0 p-4">
                    <Text className="font-semibold pb-1">Event Features</Text>
                    <div className="flex flex-col">
                      {analysis.eventFeatures.map((feature) => (
                        <Text className="flex" key={feature}>
                          <span className="my-auto mr-1">
                            <TypeIcon size={16} />
                          </span>
                          {feature as string}
                        </Text>
                      ))}
                    </div>

                    <Text className="font-semibold pt-4 pb-2">
                      Event Labels
                    </Text>
                    <div className="flex gap-2 flex-wrap">
                      {analysis.eventLabels.map((label) => (
                        <Badge key={label}>{label}</Badge>
                      ))}
                    </div>

                    <Text className="font-semibold pt-4 pb-2">Entities</Text>

                    <AccordionList>
                      {Object.entries(analysis.entities).map(
                        ([entityName, entityData]) => (
                          <Accordion>
                            <AccordionHeader>{entityName}</AccordionHeader>
                            <AccordionBody>
                              <Text className="font-semibold pb-1">
                                Features
                              </Text>
                              <div className="flex flex-col">
                                {entityData.features.map((feature) => (
                                  <Text key={feature} className="flex">
                                    <span className="my-auto mr-1">
                                      <TypeIcon size={16} />
                                    </span>
                                    {feature as string}
                                  </Text>
                                ))}
                              </div>

                              <Text className="font-semibold pt-4 pb-2">
                                Labels
                              </Text>
                              <div className="flex gap-2 flex-wrap mb-4">
                                {entityData.labels.map((label) => (
                                  <Badge key={label}>{label}</Badge>
                                ))}
                              </div>
                            </AccordionBody>
                          </Accordion>
                        )
                      )}
                    </AccordionList>
                  </div>
                ) : null}
              </div>
            </TabPanel>
            <TabPanel></TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Flex>
  );
};

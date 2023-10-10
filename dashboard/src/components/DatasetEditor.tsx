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
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { ClassNames } from "@emotion/react";
import { subDays } from "date-fns";
import { Check, History, MoreHorizontal, PlusCircle, X } from "lucide-react";
import type { editor } from "monaco-editor";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileListItem } from "~/components/FileListItem";
import {
  MonacoEditor,
  type FunctionInfoMap,
} from "~/components/sqrl-editor/MonacoEditor";
import { api } from "~/utils/api";
// import { RuleEditorSidebar } from "./RuleEditorSidebar";
import { SqrlAstError } from "sqrl";
import { compileSqrl, createSqrlInstance } from "sqrl-helpers";
import { useConfirmPageLeave } from "~/hooks/useBeforeUnload";
import { PublishModal } from "./PublishModal";
// import { sortBy } from "lodash";

interface Props {
  files: { code: string; name: string }[];
  refetchFiles: () => void;
}

const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes, are you sure you want to leave?";

export const DatasetEditor = ({ files }: Props) => {
  const { mutateAsync: createDataset } = api.datasets.create.useMutation();
  // const handleCreate = useCallback(async () => {
  //   await createDataset({
  //     name,
  //     description,
  //     rules: files,
  //   });
  // }, [createDataset, name, description, files]);

  const lastSourcesRef = useRef();
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

  const toast = useToast();

  const [sources, setSources] = useState(
    files.reduce(
      (acc, file) => {
        acc[file.name] = file.code;
        return acc;
      },
      {} as Record<string, string>
    )
  );

  const hasUnsavedChanges = useMemo(
    () => files.some((file) => file.code !== sources[file.name]),
    [files, sources]
  );
  useConfirmPageLeave(hasUnsavedChanges, UNSAVED_CHANGES_MESSAGE);

  const [currentFileName, setCurrentFileName] = useState<string>(
    files[0]?.name ?? ""
  );

  const source = useMemo<string>(
    () => sources[currentFileName] ?? "",
    [sources, currentFileName]
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
            // publishFile({
            //   id: currentFileId,
            //   version,
            //   description,
            //   code: source,
            // })
            //   .then(() => refetchFiles())
            //   .catch((error) =>
            //     toast({ title: error.message, status: "error" })
            //   );
            onPublishModalClose();
          }}
          initialVersion="0.0.0"
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

        {/* <RuleEditorSidebar
          fileSnapshots={currentFile?.fileSnapshots ?? []}
          isOpen={isDrawerOpen}
          onClose={onDrawerClose}
          finalFocusRef={btnRef}
        /> */}

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
          <HStack ml="auto" spacing={1} mb={1}>
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
              // isDisabled={
              //   (compileStatus.status !== "success" &&
              //     shouldCompile(currentFile)) ||
              //   currentFile?.currentFileSnapshot.code === source
              // }
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

          <ClassNames>
            {({ css }) => (
              <MonacoEditor
                className={css({
                  height: "100%",
                  width: "100%",
                })}
                key={currentFileName}
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
                    [currentFileName]: newSource,
                  }));
                }}
                options={{
                  automaticLayout: true,
                  padding: { top: 16 },
                  fontSize: 14,
                }}
              />
            )}
          </ClassNames>
        </Box>
      </Flex>
    </>
  );
};

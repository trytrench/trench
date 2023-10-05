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
import {
  type FunctionInfoMap,
  MonacoEditor,
} from "~/components/sqrl-editor/MonacoEditor";
import { api } from "~/utils/api";
import { PublishModal } from "./PublishModal";
import { RuleEditorSidebar } from "./RuleEditorSidebar";
import { useRouter } from "next/router";
import { useBeforeUnload, usePrevious } from "react-use";
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
  Select,
  SelectItem,
} from "@tremor/react";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { StringParam, useQueryParam } from "use-query-params";
import clsx from "clsx";

type FileData = {
  name: string;
  source: string;
};

const shouldCompile = (file?: File) => {
  return file?.name.endsWith(".sqrl");
};
const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes, are you sure you want to leave?";

interface UseDatasetEditorHookProps {}
function useDatasetEditor() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | undefined>(
    undefined
  );

  const handleFileChange = useCallback(
    (newSource: string) => {
      if (selectedFileName) {
        setFiles((prev) =>
          prev.map((file) =>
            file.name === selectedFileName
              ? { ...file, source: newSource }
              : file
          )
        );
      }
    },
    [selectedFileName]
  );

  const selectedFile = useMemo(() => {
    return files.find((file) => file.name === selectedFileName);
  }, [files, selectedFileName]);

  return {
    files,
    setFiles,
    selectedFileName,
    selectedFile,
    setSelectedFileName,
    handleFileChange,
  };
}

const monacoOptions = {
  automaticLayout: true,
  padding: { top: 16 },
  fontSize: 14,
  // scrollbar: { alwaysConsumeMouseWheel: false },
};
export function DatasetEditor() {
  const [selectedDatasetId, setSelectedDatasetId] = useQueryParam(
    "dataset",
    StringParam
  );

  const { data: dataset } = api.datasets.get.useQuery(
    { id: selectedDatasetId ?? "" },
    { enabled: !!selectedDatasetId }
  );

  const {
    files,
    setFiles,
    selectedFileName,
    selectedFile,
    setSelectedFileName,
    handleFileChange,
  } = useDatasetEditor();

  const prevDatasetId = usePrevious(dataset?.id);
  useEffect(() => {
    if (dataset && !prevDatasetId) {
      const datasetFiles = dataset.files as FileData[];

      setFiles(datasetFiles);
      setSelectedFileName(datasetFiles[0]?.name);
    }
  }, [prevDatasetId, dataset, setFiles, setSelectedFileName]);

  return (
    <div className="h-full flex items-stretch">
      <div className="flex flex-col w-48 shrink-0">
        {files.map((file) => (
          <button
            key={file.name}
            className={clsx({
              "text-left px-4 py-1": true,
              "bg-gray-200": file.name === selectedFileName,
            })}
            onClick={() => {
              setSelectedFileName(file.name);
            }}
          >
            {file.name}
          </button>
        ))}
      </div>
      <div className="flex-1">
        <MonacoEditor
          style={{
            width: "100%",
            height: "100%",
          }}
          value={selectedFile?.source ?? ""}
          // markers={
          //   compileStatus.errorMarker ? [compileStatus.errorMarker] : undefined
          // }
          sqrlFunctions={null}
          onChange={handleFileChange}
          options={monacoOptions}
          // isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

export function DatasetSelector() {
  const { data: datasets } = api.datasets.list.useQuery();
  const { data: productionDataset } = api.datasets.getProduction.useQuery();

  const [selectedDatasetId, setSelectedDatasetId] = useQueryParam(
    "dataset",
    StringParam
  );
  useEffect(() => {
    setSelectedDatasetId((prev) => {
      if (prev) return prev;
      if (productionDataset) return productionDataset.datasetId;
      return undefined;
    });
  }, [productionDataset, setSelectedDatasetId]);

  return (
    <div>
      <Select
        value={selectedDatasetId ?? undefined}
        onValueChange={(val) => {
          setSelectedDatasetId(val);
        }}
      >
        {datasets?.map((dataset) => (
          <SelectItem key={dataset.id} value={dataset.id}>
            {dataset.name}
          </SelectItem>
        )) ?? []}
      </Select>
    </div>
  );
}

export function RuleEditor() {
  return (
    <div className="h-full flex flex-col">
      <div className="flex p-4">
        <DatasetSelector />
      </div>
      <div className="flex-1">
        <DatasetEditor />
      </div>
    </div>
  );
}

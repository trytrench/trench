import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MonacoEditor } from "~/components/sqrl-editor/MonacoEditor";
import { api } from "~/utils/api";
import { usePrevious } from "react-use";
import clsx from "clsx";
import { editor } from "monaco-editor";
import { createSqrlInstance } from "../lib/createSqrlInstance";
import { compileSqrl } from "../lib/compileSqrl";
import { analyze } from "../lib/analyzeSqrl";
import { Button, Text, TextInput } from "@tremor/react";
import Link from "next/link";
import { handleError } from "../lib/handleError";
import { Icon, Spinner } from "@chakra-ui/react";
import { Check, X } from "lucide-react";
import { useDebounce } from "../hooks/useDebounce";

type FileData = {
  name: string;
  code: string;
};

const isSqrlFile = (fileName?: string) => {
  return !!fileName?.endsWith(".sqrl");
};
const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes, are you sure you want to leave?";

function useFilesEditor() {
  const [files, setFiles] = useState<FileData[]>([]);
  const [selectedFileName, setSelectedFileName] = useState<string | undefined>(
    undefined
  );

  const handleFileChange = useCallback(
    (newCode: string) => {
      if (selectedFileName) {
        setFiles((prev) =>
          prev.map((file) =>
            file.name === selectedFileName ? { ...file, code: newCode } : file
          )
        );
      }
    },
    [selectedFileName]
  );

  const selectedFile = useMemo(() => {
    return files.find((file) => file.name === selectedFileName);
  }, [files, selectedFileName]);

  const [compileStatus, setCompileStatus] = useState<{
    status: "error" | "success" | "pending";
    message: string;
    errorMarker?: editor.IMarkerData;
  }>({ status: "pending", message: "Requesting initial compilation…" });
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
            acc[file.name] = file.code;
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
    } catch (error: any) {
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
  }, [files]);

  const debouncedFile = useDebounce(selectedFile, 300);
  const lastFile = usePrevious(debouncedFile);

  useEffect(() => {
    if (lastFile !== debouncedFile && isSqrlFile(debouncedFile?.name)) {
      recompile().catch(handleError);
    }
  }, [debouncedFile, lastFile, recompile]);

  return {
    files,
    setFiles,
    selectedFileName,
    selectedFile,
    setSelectedFileName,
    handleFileChange,
    recompile,
    compileStatus,
  };
}

const monacoOptions = {
  automaticLayout: true,
  padding: { top: 16 },
  fontSize: 14,
  // scrollbar: { alwaysConsumeMouseWheel: false },
};

interface DatasetEditorProps {
  readonly?: boolean;
  datasetId: string | null; // Null means you're creating a new dataset
}
export function DatasetEditor(props: DatasetEditorProps) {
  const { readonly = false, datasetId } = props;

  const { data: dataset } = api.datasets.get.useQuery(
    { id: datasetId ?? "" },
    { enabled: !!datasetId }
  );

  const {
    files,
    setFiles,
    selectedFileName,
    selectedFile,
    setSelectedFileName,
    handleFileChange,
    compileStatus,
  } = useFilesEditor();

  const [name, setName] = useState(dataset?.name ?? "");
  const [description, setDescription] = useState(dataset?.description ?? "");

  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (dataset && !initialized) {
      const datasetFiles = dataset.rules as FileData[];

      setFiles(datasetFiles);
      setSelectedFileName(datasetFiles[0]?.name);
      setInitialized(true);
    }
  }, [dataset, initialized, setFiles, setSelectedFileName]);

  const { mutateAsync: createDataset } = api.datasets.create.useMutation();
  const handleCreate = useCallback(async () => {
    await createDataset({
      name,
      description,
      rules: files,
    });
  }, [createDataset, name, description, files]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 flex items-center gap-4">
        <div>
          <Text className="text-xs">Name</Text>
          <TextInput
            placeholder="Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
            }}
            disabled={readonly}
          />
        </div>
        <div>
          <Text className="text-xs">Description</Text>
          <TextInput
            placeholder="Description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
            }}
            disabled={readonly}
          />
        </div>
        <div className="flex-1"></div>
        <div className="flex">
          {isSqrlFile(selectedFile?.name ?? "") ? (
            <div className="mr-2">
              {compileStatus.status === "pending" ? (
                <Spinner size="sm" speed="0.8s" />
              ) : compileStatus.status === "error" ? (
                <Icon fontSize="18" as={X} color="red.500" />
              ) : compileStatus.status === "success" ? (
                <Icon fontSize="18" as={Check} color="green.500" />
              ) : null}
            </div>
          ) : null}
          <div>
            {readonly ? (
              <Link href={`/create?forkFrom=${datasetId}`}>
                <Button>Fork</Button>
              </Link>
            ) : (
              <Button
                onClick={() => {
                  handleCreate().catch(handleError);
                }}
              >
                Create
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-stretch">
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
            key={selectedFileName}
            readonly={readonly}
            style={{
              width: "100%",
              height: "100%",
            }}
            value={selectedFile?.code ?? ""}
            markers={
              compileStatus.errorMarker
                ? [compileStatus.errorMarker]
                : undefined
            }
            sqrlFunctions={null}
            onChange={handleFileChange}
            options={monacoOptions}
          />
        </div>
      </div>
    </div>
  );
}

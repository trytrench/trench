import { useRef, useEffect, useCallback } from "react";
import Editor, { type OnChange, type Monaco } from "@monaco-editor/react";
import { useMonacoEditor } from "../../hooks/useMonacoEditor";
import type EditorApi from "monaco-editor/esm/vs/editor/editor.api";
import { configureSqrlLanguage } from "./configureSqrlLanguage";
import { type ChangeHandler, type FunctionInfoMap } from "./types";
import { editor } from "monaco-editor/esm/vs/editor/editor.api";

export interface MonacoEditorProps {
  className?: string;
  onChange?: ChangeHandler;
  options?: EditorApi.editor.IStandaloneEditorConstructionOptions;
  isDarkMode?: boolean;
  value: string;
  style?: React.CSSProperties;
  markers?: Omit<EditorApi.editor.IMarkerData, "relatedInformation">[];
  sqrlFunctions: FunctionInfoMap | null;
  readonly?: boolean;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  className,
  onChange,
  options = {},
  isDarkMode = true,
  readonly = false,
  value,
  style,
  markers,
  sqrlFunctions,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const monacoSetup = useCallback(
    (monaco: Monaco) => {
      monaco.editor.getModels().forEach((model) => model.dispose());

      configureSqrlLanguage(monaco, sqrlFunctions ?? {});
    },
    [sqrlFunctions]
  );

  const handleMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editor.updateOptions({
        readOnly: readonly,
      });

      editorRef.current = editor;

      const model = editor.getModel();
      if (!model) return;
    },
    [readonly]
  );

  const editorElement = useRef<HTMLDivElement>(null);

  return (
    <Editor
      language="sqrl"
      theme="vs-dark"
      value={value}
      onChange={(e, ev) => {
        if (!readonly) {
          onChange?.(e ?? "", ev);
        }
      }}
      beforeMount={monacoSetup}
      onMount={handleMount}
      height={"100%"}
      options={{
        minimap: { enabled: false },
        automaticLayout: true,
        fontSize: 16,
        padding: {
          top: 24,
          bottom: 24,
        },
      }}
    />
  );
};

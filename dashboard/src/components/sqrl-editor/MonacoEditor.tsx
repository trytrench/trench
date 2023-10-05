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
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  className,
  onChange,
  options = {},
  isDarkMode = true,
  value,
  style,
  markers,
  sqrlFunctions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const monacoEditorObj = useMonacoEditor();
  const editorRef = useRef<EditorApi.editor.IStandaloneCodeEditor>();
  const theme = isDarkMode ? "custom-dark" : "custom";

  useEffect(() => {
    editorRef.current?.updateOptions({ theme });
  }, [theme]);

  useEffect(() => {
    if (!editorRef.current || monacoEditorObj.state !== "success") return;

    const model = editorRef.current.getModel();
    if (!model) return;

    monacoEditorObj.value.editor.setModelMarkers(
      model,
      "monaco editor react",
      markers ?? []
    );
  }, [monacoEditorObj.state, markers, monacoEditorObj.value]);

  useEffect(() => {
    if (monacoEditorObj.state !== "success" || !containerRef.current) return;

    const monacoEditor = monacoEditorObj.value;

    // @todo(josh): Not sure if this is the correct way to do this only once per editor? The SQRL
    // functions will be compiled in so they won't change ever.
    const sqrlLanguage = configureSqrlLanguage(
      monacoEditor,
      sqrlFunctions ?? {}
    );

    const model = monacoEditor.editor.createModel(
      "",
      "sqrl",
      monacoEditor.Uri.file("example.tsx")
    );

    const editor = monacoEditor.editor.create(containerRef.current, {
      scrollBeyondLastLine: true,
      minimap: {
        enabled: true,
      },
      ...options,
      language: "sqrl",
      model,
      theme,
    });

    editorRef.current = editor;

    const resizeObserver = new ResizeObserver((entries) => {
      const containerElement = entries.find(
        (entry) => entry.target === containerRef.current
      );
      // container was resized
      if (containerElement) {
        editor.layout();
      }
    });

    resizeObserver.observe(containerRef.current);

    const onChangeModelContentSubscription = editor.onDidChangeModelContent(
      (event) => {
        const value = editor.getValue() || "";
        onChange?.(value, event);
      }
    );

    return () => {
      sqrlLanguage.dispose();
      editor.dispose();
      model.dispose();
      onChangeModelContentSubscription.dispose();
      resizeObserver.disconnect();
    };
  }, [monacoEditorObj.state, sqrlFunctions, monacoEditorObj.value, theme]);

  return <div style={style} className={className} ref={containerRef} />;
};

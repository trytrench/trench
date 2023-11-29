import { useRef, useEffect } from "react";
import type EditorApi from "monaco-editor/esm/vs/editor/editor.api";
import { FunctionInfo } from "sqrl";
import { IDisposable } from "monaco-editor/esm/vs/editor/editor.api";
import { useMonacoEditor } from "../../hooks/useMonacoEditor";
import { useTheme } from "next-themes";
import { configureSqrlLanguage } from "./configureSqrlLanguage";

export type ChangeHandler = (
  value: string,
  event: EditorApi.editor.IModelContentChangedEvent
) => void;

export type FunctionInfoMap = {
  [name: string]: FunctionInfo;
};

export interface MonacoEditorProps {
  className?: string;
  onChange?: ChangeHandler;
  options?: EditorApi.editor.IStandaloneEditorConstructionOptions;
  isDarkMode?: boolean;
  value: string;
  style?: React.CSSProperties;
  markers?: Omit<EditorApi.editor.IMarkerData, "relatedInformation">[];
  sqrlFunctions: FunctionInfoMap | null;
  readOnly?: boolean;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  className,
  onChange,
  options = {},
  value,
  style,
  markers,
  sqrlFunctions,
  readOnly,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const monacoEditorObj = useMonacoEditor();
  const editorRef = useRef<EditorApi.editor.IStandaloneCodeEditor>();

  const { resolvedTheme } = useTheme();

  const theme = resolvedTheme === "dark" ? "custom-dark" : "custom";

  useEffect(() => {
    editorRef.current?.updateOptions({ theme: theme, readOnly });
  }, [editorRef.current, theme]);

  useEffect(() => {
    if (!editorRef.current || monacoEditorObj.state !== "success") return;

    const model = editorRef.current.getModel();
    if (!model) return;

    monacoEditorObj.value.editor.setModelMarkers(
      model,
      "monaco editor react",
      markers ?? []
    );
  }, [editorRef.current, monacoEditorObj.state, markers]);

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
      value,
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
      theme: theme,
    });

    editorRef.current = editor;

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
    };
  }, [monacoEditorObj.state, containerRef.current]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      const containerElement = entries.find(
        (entry) => entry.target === containerRef.current
      );
      // container was resized
      if (containerElement) {
        editorRef.current?.layout();
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    const model = editor.getModel();

    if (!model) return;

    const currentValue = model.getValue();

    // Check if the value is different from the editor's current value
    if (value !== currentValue) {
      // Push an undo stop for the current state
      editor.pushUndoStop();

      // Execute edits to transform the current value to the new value
      editor.executeEdits("", [
        {
          range: model.getFullModelRange(),
          text: value,
        },
      ]);

      // Push another undo stop for the new state
      editor.pushUndoStop();
    }
  }, [value]);

  return <div style={style} className={className} ref={containerRef} />;
};

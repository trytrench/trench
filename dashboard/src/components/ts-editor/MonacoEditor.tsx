import { useRef, useEffect, useCallback, useMemo, useState } from "react";
import type EditorApi from "monaco-editor/esm/vs/editor/editor.api";
import { IDisposable, Position } from "monaco-editor/esm/vs/editor/editor.api";
import { useMonacoEditor } from "./useMonacoEditor";
import { COMPILER_OPTIONS } from "./compilerOptions";

// @ts-ignore
import libSource from "!!raw-loader?esModule=false!./editorLib.ts";

export type ChangeHandler = (
  value: string,
  event: EditorApi.editor.IModelContentChangedEvent
) => void;

export interface MonacoEditorProps {
  className?: string;
  options?: EditorApi.editor.IStandaloneEditorConstructionOptions;
  isDarkMode?: boolean;
  value: string;
  onValueChange?: (value: string) => void;
  style?: React.CSSProperties;
  markers?: Omit<EditorApi.editor.IMarkerData, "relatedInformation">[];
  readOnly?: boolean;
  prefix?: string;
  suffix?: string;
}

function getLineCount(text: string) {
  return text ? text.split("\n").length : 0;
}
export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  className,
  options = {},
  value: bareValue,
  onValueChange,
  style,
  markers,
  readOnly,
  prefix = "",
  suffix = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const monacoEditorObj = useMonacoEditor();
  const editorRef = useRef<EditorApi.editor.IStandaloneCodeEditor>();

  const theme = true ? "custom-dark" : "custom";

  const prefixLineCount = useMemo(() => getLineCount(prefix), [prefix]);
  const suffixLineCount = useMemo(() => getLineCount(suffix), [suffix]);

  const [value, setValue] = useState<string>("");
  useEffect(() => {
    setValue(`${prefix}\n${bareValue}\n${suffix}`);
  }, [prefix, bareValue, suffix]);

  useEffect(() => {
    onValueChange?.(stripPrefixAndSuffix(value));
  }, [value]);

  const stripPrefixAndSuffix = useCallback(
    (code: string) => {
      const lines = code.split("\n");
      return lines
        .slice(prefixLineCount, lines.length - suffixLineCount)
        .join("\n");
    },
    [prefixLineCount, suffixLineCount]
  );

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
    if (!monacoEditor) return;

    const model = monacoEditor.editor.createModel(
      value,
      "typescript",
      monacoEditor.Uri.file("example.tsx")
    );

    monacoEditor.languages.typescript.typescriptDefaults.addExtraLib(
      `${libSource}`,
      "file:///node_modules/@my-project/package-one/index.d.ts" // irrelevant?
    );

    const editor = monacoEditor.editor.create(containerRef.current, {
      scrollBeyondLastLine: true,
      minimap: {
        enabled: true,
      },
      ...options,
      language: "typescript",
      model,
      theme: theme,
    });

    monacoEditor.languages.typescript.typescriptDefaults.setCompilerOptions(
      COMPILER_OPTIONS as any
    );

    editor.onDidChangeCursorSelection(({ selection }) => {
      const editableRange = new monacoEditor.Range(
        prefixLineCount + 1,
        1,
        model.getLineCount() - suffixLineCount,
        model.getLineLength(model.getLineCount() - suffixLineCount) + 1
      );

      const clipped = (pos: Position) => {
        if (pos.isBefore(editableRange.getStartPosition()))
          return editableRange.getStartPosition();
        if (!pos.isBefore(editableRange.getEndPosition()))
          return editableRange.getEndPosition();
        return pos;
      };

      const newCursorPos = clipped(selection.getPosition());
      const newStartPos = clipped(selection.getSelectionStart());

      editor.setSelection(
        new monacoEditor.Selection(
          newStartPos.lineNumber,
          newStartPos.column,
          newCursorPos.lineNumber,
          newCursorPos.column
        )
      );
    });

    editorRef.current = editor;

    const onChangeModelContentSubscription = editor.onDidChangeModelContent(
      (event) => {
        setTimeout(() => {
          const value = editor.getValue() || "";
          setValue(value);
        }, 0);
      }
    );

    return () => {
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

    if (containerRef.current) resizeObserver.observe(containerRef.current);

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

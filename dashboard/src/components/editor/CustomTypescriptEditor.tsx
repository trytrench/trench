"use client";
import React, { useRef, useMemo, useCallback } from "react";
import Editor, { type OnChange, type Monaco } from "@monaco-editor/react";
import { Position, type editor } from "monaco-editor";
import { TYPES_SOURCE } from "./constants";

interface CustomTypeScriptEditorProps {
  readOnlyBoilerplate?: {
    prefix: string;
    suffix: string;
  };
  dynamicTsLib?: string;
  value: string;
  onChange: OnChange;
}

export const CustomTypeScriptEditor: React.FC<CustomTypeScriptEditorProps> = ({
  value,
  onChange,
  readOnlyBoilerplate,
  dynamicTsLib,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const monacoSetup = useCallback(
    (monaco: Monaco) => {
      monaco.editor.getModels().forEach((model) => model.dispose());

      // validation settings
      monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
        noSemanticValidation: true,
        noSyntaxValidation: false,
      });

      // compiler options
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        allowNonTsExtensions: true,
        strict: true,
        alwaysStrict: true,
      });

      // extra libraries
      const libSource = `${TYPES_SOURCE}\n${dynamicTsLib ?? ""}`;
      const libUri = "ts:filename/facts.d.ts";
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        libSource,
        libUri
      );
      // When resolving definitions and references, the editor will try to use created models.
      // Creating a model for the library allows "peek definition/references" commands to work with the library.
      monaco.editor.createModel(
        libSource,
        "typescript",
        monaco.Uri.parse(libUri)
      );
    },
    [dynamicTsLib]
  );

  const handleMount = useCallback(
    (editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
      editorRef.current = editor;

      const model = editor.getModel();
      if (!model) return;

      const rdonlyPrefix = readOnlyBoilerplate?.prefix ?? "";
      const rdonlyPrefixLines = rdonlyPrefix.split("\n").length;
      const rdonlySuffix = readOnlyBoilerplate?.suffix ?? "";
      const rdonlySuffixLines = rdonlySuffix.split("\n").length;

      editor.getModel()?.onDidChangeContent((e) => {
        const value = editor.getValue();
        const lines = value.split("\n");
        const prefix = lines.slice(0, rdonlyPrefixLines).join("\n");
        const suffix = lines
          .slice(lines.length - rdonlySuffixLines, lines.length)
          .join("\n");

        // if the prefix and suffix are changed, reject the change by undoing
        if (
          prefix !== rdonlyPrefix ||
          suffix !== rdonlySuffix ||
          lines.length < rdonlyPrefixLines + rdonlySuffixLines + 1 // we want an empty line between prefix and suffix
        ) {
          if (e.isUndoing) {
            editor.trigger("editor", "redo", null);
          } else {
            editor.trigger("editor", "undo", null);
          }
        }
      });

      editor.onDidChangeCursorSelection(({ selection }) => {
        const editableRange = new monaco.Range(
          rdonlyPrefixLines + 1,
          1,
          model.getLineCount() - rdonlySuffixLines,
          model.getLineLength(model.getLineCount() - rdonlySuffixLines) + 1
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
          new monaco.Selection(
            newStartPos.lineNumber,
            newStartPos.column,
            newCursorPos.lineNumber,
            newCursorPos.column
          )
        );
      });

      editor.updateOptions({
        readOnly: false,
      });
    },
    [readOnlyBoilerplate?.prefix, readOnlyBoilerplate?.suffix]
  );

  const editorElement = useRef<HTMLDivElement>(null);
  const addPrefixAndSuffix = useCallback(
    (value: string) => {
      const rdonlyPrefix = readOnlyBoilerplate?.prefix ?? "";
      const rdonlySuffix = readOnlyBoilerplate?.suffix ?? "";

      return `${rdonlyPrefix.trim()}\n${value}\n${rdonlySuffix.trim()}`;
    },
    [readOnlyBoilerplate?.prefix, readOnlyBoilerplate?.suffix]
  );

  const stripPrefixAndSuffix = useCallback(
    (value: string) => {
      const rdonlyPrefix = readOnlyBoilerplate?.prefix ?? "";
      const rdonlySuffix = readOnlyBoilerplate?.suffix ?? "";
      const rdonlyPrefixLines = rdonlyPrefix.split("\n").length;
      const rdonlySuffixLines = rdonlySuffix.split("\n").length;
      const lines = value.split("\n");
      return lines
        .slice(rdonlyPrefixLines, lines.length - rdonlySuffixLines)
        .join("\n");
    },
    [readOnlyBoilerplate?.prefix, readOnlyBoilerplate?.suffix]
  );

  const realValue = useMemo(() => {
    const rdonlyPrefix = readOnlyBoilerplate?.prefix ?? "";
    const rdonlySuffix = readOnlyBoilerplate?.suffix ?? "";
    return `${rdonlyPrefix.trim()}\n${value}\n${rdonlySuffix.trim()}`;
  }, [readOnlyBoilerplate?.prefix, readOnlyBoilerplate?.suffix, value]);

  return (
    <Editor
      language="typescript"
      theme="vs-dark"
      value={realValue}
      onChange={(e, ev) => {
        const stripped = stripPrefixAndSuffix(e ?? "");
        onChange?.(stripped, ev);
      }}
      beforeMount={monacoSetup}
      onMount={handleMount}
      height={400}
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

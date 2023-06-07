"use client";
import React, { useRef, useEffect, useMemo, useCallback } from "react";
import Editor, { OnChange, useMonaco, Monaco } from "@monaco-editor/react";
import { editor, Range } from "monaco-editor";
import { TYPES_SOURCE } from "./constants";
import { Box } from "@chakra-ui/react";

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
      var libSource = `${TYPES_SOURCE}\n${dynamicTsLib ?? ""}`;
      var libUri = "ts:filename/facts.d.ts";
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

      editor.onDidChangeCursorPosition(function (e) {
        const totalLines = model.getLineCount();
        const lastLine = totalLines - rdonlySuffixLines;

        if (e.position.lineNumber <= rdonlyPrefixLines) {
          editor?.setPosition({
            lineNumber: rdonlyPrefixLines + 1,
            column: e.position.column,
          });
        } else if (e.position.lineNumber > lastLine) {
          editor?.setPosition({
            lineNumber: lastLine,
            column: model.getLineLength(lastLine) + 1,
          });
        }
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
        minimap: { enabled: true },
        automaticLayout: true,
        fontSize: 16,
      }}
    />
  );
};

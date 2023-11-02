import { useRef, useEffect } from "react";
import type EditorApi from "monaco-editor/esm/vs/editor/editor.api";
import { FunctionInfo } from "sqrl";
import { IDisposable } from "monaco-editor/esm/vs/editor/editor.api";
import { useMonacoEditor } from "../../hooks/useMonacoEditor";

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

function configureSqrlLanguage(
  monaco: typeof EditorApi,
  functions: FunctionInfoMap
) {
  const disposables: IDisposable[] = [];
  monaco.languages.register({
    id: "sqrl",
  });

  const keywords = [
    // definitions
    "let",
    // logic
    "not",
    "and",
    "or",
    // rules
    "create",
    "rule",
    "where",
    "with",
    "reason",
    "when",
    "then",
    // loops
    "for",
    "in",
    // counters
    // @todo: These should only apply *inside count function parameters
    "by",
    "total",
    "last",
    "every",
    // @note: max() is also a function
    "max",
    "second",
    "seconds",
    "minute",
    "minutes",
    "hour",
    "hours",
    "day",
    "days",
    "week",
    "weeks",
    "month",
    "months",
  ];

  const builtin = ["input"];
  const functionNames = Object.keys(functions).sort();
  const functionsInfo = functionNames.map((f) => functions[f]);

  disposables.push(
    monaco.languages.setMonarchTokensProvider("sqrl", {
      ignoreCase: true,

      builtin,
      functions: functionNames,
      keywords,
      escapes: /\\/,

      operators: [
        "+",
        "-",
        "/",
        "*",
        "%",
        ":=",
        "=",
        "!=",
        ">",
        "<",
        ">=",
        "<=",
      ],
      boolean: ["true", "false"],
      symbols: /[=><!~:|+\-*\/%]+/,

      tokenizer: {
        root: [
          // identifiers
          [
            /[a-z]\w+/,
            {
              cases: {
                "@keywords": "keyword",
                "@boolean": "number",
                "@builtin": "type",
                "@functions": "key",
                "@default": "identifier",
              },
            },
          ],

          // strings
          [/"([^"\\]|\\.)*$/, "string.invalid"],
          [/'([^'\\]|\\.)*$/, "string.invalid"],
          [
            /["']/,
            { token: "string.delim", bracket: "@open", next: "@string.$0" },
          ],

          // numbers
          [/[\d-]+/, "number"],

          // operators
          [
            /@symbols/,
            {
              cases: {
                "@operators": "operator",
                "@default": "",
              },
            },
          ],

          // comments
          [/#/, "comment", "@comment"],

          // whitespace
          { include: "@whitespace" },
        ],
        comment: [
          [/@(WARNING|EXAMPLE|NOTE|TODO)$/, "comment.todo", "@pop"],
          [/@(WARNING|EXAMPLE|NOTE|TODO)/, "comment.todo"],
          [/\[(WARNING|EXAMPLE|NOTE|TODO)\]$/, "comment.todo", "@pop"],
          [/\[(WARNING|EXAMPLE|NOTE|TODO)\]/, "comment.todo"],
          [/.$/, "comment", "@pop"],
          [/./, "comment"],
        ],
        string: [
          [/\$\{[a-z]+\}/i, { token: "string.identifier" }],
          [/[^"'$]+|\$/, { token: "string" }],
          [/@escapes/, "string.escape"],
          [/\\./, "string.escape.invalid"],

          [
            /["']/,
            {
              cases: {
                "$#==$S2": {
                  token: "string.delim",
                  bracket: "@close",
                  next: "@pop",
                },
                "@default": { token: "string" },
              },
            },
          ],
          [/./, "string.invalid"],
        ],
        whitespace: [[/[ \t\r\n]+/, "white"]],
      },
    })
  );

  disposables.push(
    monaco.languages.registerCompletionItemProvider("sqrl", {
      provideCompletionItems: function (model, position) {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        return {
          suggestions: functionsInfo.map((f) => ({
            label: f.name,
            kind: monaco.languages.CompletionItemKind.Function,
            range,
            insertText: f.name,
            description: f.docstring,
          })),
        };
      },
    })
  );

  disposables.push(
    monaco.languages.registerHoverProvider("sqrl", {
      provideHover: function (model, position) {
        const word = model.getWordAtPosition(position);
        const info = word && functions[word.word];
        if (info) {
          const callstring = `${info.name}(${
            functions[word.word]?.argstring || ""
          })`;

          return {
            range: {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: word.startColumn,
              endColumn: word.endColumn,
            },
            contents: [
              {
                value:
                  `# ${callstring}\n\n_from ${info.package}_\n\n` +
                  functions[word.word]?.docstring,
              },
            ],
          };
        }
      },
    })
  );

  monaco.editor.defineTheme("custom", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "string.identifier", foreground: "9f8500" },
      { token: "comment.todo", foreground: "006600", fontStyle: "bold" },
    ],
    colors: {},
  });

  monaco.editor.defineTheme("custom-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "string.identifier", foreground: "e0a500" },
      { token: "comment.todo", foreground: "88af88", fontStyle: "bold" },
    ],
    colors: {},
  });

  return {
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
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
  readOnly,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const monacoEditorObj = useMonacoEditor();
  const editorRef = useRef<EditorApi.editor.IStandaloneCodeEditor>();
  const theme = isDarkMode ? "custom-dark" : "custom";

  useEffect(() => {
    editorRef.current?.updateOptions({ theme, readOnly });
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
      theme,
    });

    editorRef.current = editor;

    // const resizeObserver = new ResizeObserver((entries) => {
    //   const containerElement = entries.find(
    //     (entry) => entry.target === containerRef.current
    //   );
    //   // container was resized
    //   if (containerElement) {
    //     editor.layout();
    //   }
    // });

    // resizeObserver.observe(containerRef.current);

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
      // resizeObserver.disconnect();
    };
  }, [monacoEditorObj.state, sqrlFunctions, containerRef.current]);

  return <div style={style} className={className} ref={containerRef} />;
};

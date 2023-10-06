import type EditorApi from "monaco-editor/esm/vs/editor/editor.api";
import { type IDisposable } from "monaco-editor/esm/vs/editor/editor.api";
import { type FunctionInfoMap } from "./types";

export function configureSqrlLanguage(
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
            label: f!.name,
            kind: monaco.languages.CompletionItemKind.Function,
            range,
            insertText: f!.name,
            description: f!.docstring,
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
            functions[word.word]?.argstring ?? ""
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

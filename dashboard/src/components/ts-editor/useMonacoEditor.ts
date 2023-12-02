import { useState, useEffect } from "react";
import type { IDisposable } from "monaco-editor/esm/vs/editor/editor.api";

interface ErrorState {
  state: "error";
  value: string;
}

interface PendingState {
  state: "pending";
  value: undefined;
}

interface SuccessState {
  state: "success";
  value: typeof import("monaco-editor/esm/vs/editor/editor.api");
}

export const useMonacoEditor = (): ErrorState | PendingState | SuccessState => {
  const [monacoEditorState, setMonacoEditorState] =
    useState<typeof import("monaco-editor/esm/vs/editor/editor.api")>();

  const [errorState, setErrorState] = useState<string>("");

  useEffect(() => {
    // only fetch monaco-editor in a browser environment
    if (typeof window === "undefined") return;

    import(
      /* webpackChunkName: "monaco-editor" */ "monaco-editor/esm/vs/editor/editor.api"
    )
      .then(setMonacoEditorState)
      .catch(() => {
        setErrorState(
          "Failed to load monaco-editor. Please check your internet connection.",
        );
      });
  }, []);

  if (errorState) {
    return {
      state: "error",
      value: errorState,
    };
  }

  if (monacoEditorState) {
    return {
      state: "success",
      value: monacoEditorState,
    };
  }

  return {
    state: "pending",
    value: undefined,
  };
};

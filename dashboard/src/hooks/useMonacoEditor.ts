import { useState, useEffect } from "react";
import type { IDisposable } from "monaco-editor/esm/vs/editor/editor.api";

interface ErrorState {
  state: "error";
  value: unknown;
}

interface PendingState {
  state: "pending";
}

interface SuccessState {
  state: "success";
  value: typeof import("monaco-editor/esm/vs/editor/editor.api");
}

export const useMonacoEditor = (): ErrorState | PendingState | SuccessState => {
  const [monacoEditorState, setMonacoEditorState] =
    useState<typeof import("monaco-editor/esm/vs/editor/editor.api")>();

  const [errorState, setErrorState] = useState<unknown>();

  useEffect(() => {
    // only fetch monaco-editor in a browser environment
    if (typeof window === "undefined") return;

    import(
      /* webpackChunkName: "monaco-editor" */ "monaco-editor/esm/vs/editor/editor.api"
    )
      .then(setMonacoEditorState)
      .catch(setErrorState);
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
  };
};

import type EditorApi from "monaco-editor/esm/vs/editor/editor.api";

export type ChangeHandler = (
  value: string,
  event: EditorApi.editor.IModelContentChangedEvent,
) => void;

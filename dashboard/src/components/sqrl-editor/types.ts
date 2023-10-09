import type EditorApi from "monaco-editor/esm/vs/editor/editor.api";
import { type FunctionInfo } from "sqrl";

export type ChangeHandler = (
  value: string,
  event: EditorApi.editor.IModelContentChangedEvent
) => void;

export type FunctionInfoMap = Record<string, FunctionInfo>;

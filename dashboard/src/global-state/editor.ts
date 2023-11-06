import { atom } from "jotai";
import type { editor } from "monaco-editor";
import { CompiledExecutable } from "sqrl";

/**
 * Event Handler Editor - State
 */

export type EditorState = {
  code: Record<string, string>;
};

const DEFAULT_EDITOR_STATE: EditorState = {
  code: {},
};

export const editorStateAtom = atom<EditorState>(DEFAULT_EDITOR_STATE);

/**
 * Event handler Editor - Compiler Status
 */

export type CompileStatus =
  | {
      status: "error";
      message: string;
      errorMarker?: editor.IMarkerData & {
        filename: string;
      };
    }
  | {
      status: "success";
      message: string;
      compiledExecutable: CompiledExecutable;
      codeHash: string;
      code: Record<string, string>;
    }
  | {
      status: "compiling";
      message: string;
    }
  | {
      status: "empty";
    };

const DEFAULT_COMPILE_STATUS: CompileStatus = {
  status: "empty",
};

export const compileStatusAtom = atom<CompileStatus>(DEFAULT_COMPILE_STATUS);

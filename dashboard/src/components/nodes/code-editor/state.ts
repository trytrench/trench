import { atom } from "jotai";
import { type Diagnostic, type ts } from "ts-morph";

export type CompileStatus =
  | {
      status: "empty";
    }
  | {
      status: "compiling";
      message: string;
    }
  | {
      status: "success";
      message: string;
      code: string;
      compiled: string;
    }
  | {
      status: "error";
      message: string;
      diagnostics: Diagnostic<ts.Diagnostic>[];
    };

export const compileStatueAtom = atom<CompileStatus>({ status: "empty" });

export const FUNCTION_TEMPLATE = `const getValue: ValueGetter = async (input) => {\n\n}`;

export const tsCodeAtom = atom<string>(FUNCTION_TEMPLATE);
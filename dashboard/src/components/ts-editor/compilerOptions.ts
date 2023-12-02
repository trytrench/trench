// import { ts } from "@ts-morph/bootstrap";
import { ts } from "ts-morph";

export const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  strict: true,
  alwaysStrict: false,
};

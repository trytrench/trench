import { z } from "zod";
import { FnType } from "../enum";
import { createFnTypeDefBuilder } from "../builder";
import {
  DataPath,
  DataPathInfoGetter,
  dataPathZodSchema,
} from "../../data-path";
import { functions } from "../lib/computedNodeFunctions";
import { TSchema, createDataType } from "../../data-types";
import { Diagnostic, Project, SyntaxKind, ts } from "ts-morph";
import { footprintOfType } from "../lib/schemaFootprint";

let libSource: string | null = null;

// Check if 'raw-loader' is available (indicating a webpack environment)
if (typeof require.resolve === "function") {
  try {
    libSource = require("!!raw-loader?esModule=false!../lib/computedNodeLib.ts");
  } catch (error) {
    // 'raw-loader' not available, fallback to non-Webpack approach
  }
}

// If 'raw-loader' is not available or encountered an error, use a different method
if (!libSource) {
  const fs = require("fs");
  const path = require("path");

  const filePath = path.resolve(__dirname, "../lib/computedNodeLib.ts");
  libSource = fs.readFileSync(filePath, "utf8");
}

export type SerializableTsCompilerError = {
  message: string;
  code: number;
  category: ts.DiagnosticCategory;
  file: string | null;
  start: number | null;
  length: number | null;
};

export function getTypeDefs(options: {
  deps: Record<string, DataPath | null>;
  returnSchema: TSchema;
  getDataPathInfo: DataPathInfoGetter;
}) {
  const { deps, getDataPathInfo, returnSchema } = options;

  const functionType = `type ValueGetter = (input: Input) => Promise<${createDataType(
    returnSchema
  ).toTypescript()}>;`;

  const inputTypes = `
    type Input = {
      ${Object.entries(deps)
        .map(([key, value]) => {
          const schema = value ? getDataPathInfo(value)?.schema : null;
          const schemaTs = schema
            ? createDataType(schema).toTypescript()
            : "unknown";
          return `${key}: ${schemaTs};`;
        })
        .join("\n")}
    }
  `;

  return [libSource ?? "", inputTypes, functionType].join("\n\n");
}

export const TS_COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ESNext,
  allowNonTsExtensions: true,
  strict: true,
  alwaysStrict: false,
};

export type CompileTsResult = (
  | {
      success: true;
      compiledJs: string;
    }
  | {
      success: false;
      errors: SerializableTsCompilerError[];
    }
) & {
  inferredSchema: TSchema | null;
};

export function compileTs(options: {
  code: string;
  typeDefs: string;
}): CompileTsResult {
  const { code, typeDefs } = options;

  const finalCode = [code, typeDefs].join("\n");

  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: TS_COMPILER_OPTIONS,
  });

  const sourceFile = project.createSourceFile("main.ts", finalCode);
  const arrowFunction = sourceFile
    .getVariableDeclaration("getValue")
    ?.getInitializerIfKind(SyntaxKind.ArrowFunction);

  let inferredSchema: TSchema | null = null;
  if (arrowFunction) {
    // Get the inferred return type of the arrow function
    const returnType = arrowFunction.getReturnType();

    const typeName = "NonCollidingTypeName_1234";
    sourceFile.addTypeAlias({
      name: typeName,
      type: `Awaited<${returnType.getText()}>`,
    });

    const node = sourceFile.getTypeAliasOrThrow(typeName);
    const type = node.getType();
    inferredSchema = footprintOfType({
      type: type,
      node: node,
    });
  }

  const errors = project.getPreEmitDiagnostics().map((d) => {
    let msg = d.getMessageText();
    if (typeof msg === "object") {
      msg = msg.getMessageText();
    }
    return {
      message: msg,
      code: d.getCode(),
      category: d.getCategory(),
      file: d.getSourceFile()?.getFilePath() ?? null,
      start: d.getStart() ?? null,
      length: d.getLength() ?? null,
    };
  });

  // Set compile status based on results

  if (!errors.length) {
    const transpiledOutput = ts.transpileModule(finalCode, {
      compilerOptions: {
        ...TS_COMPILER_OPTIONS,
      },
    });
    return {
      success: true,
      compiledJs: transpiledOutput.outputText,
      inferredSchema,
    };
  } else {
    return {
      success: false,
      errors: errors,
      inferredSchema,
    };
  }
}

export const computedFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.Computed)
  .setConfigSchema(
    z.object({
      tsCode: z.string().min(1),
      compiledJs: z.string().min(1),
      // depsSchema: z.record(z.string(), tSchemaZod),
    })
  )
  .setInputSchema(
    z.object({
      depsMap: z.record(z.string(), dataPathZodSchema),
    })
  )
  .setGetDataPaths((input) => {
    return Object.values(input.depsMap);
  })
  .setValidateInputs(({ inputs, fnDef, getDataPathInfo }) => {
    const { depsMap } = inputs;
    const typeDefs = getTypeDefs({
      deps: depsMap,
      getDataPathInfo,
      returnSchema: fnDef.returnSchema,
    });

    const compileResult = compileTs({
      code: fnDef.config.tsCode,
      typeDefs,
    });

    if (compileResult.success) {
      return {
        success: true,
      };
    } else {
      let msg = compileResult.errors[0]?.message ?? "Unknown error";

      return {
        success: false,
        error: `Error compiling TS: ${msg}`,
      };
    }
  })
  .build();

import { z } from "zod";
import { FnType } from "./_enum";
import { createFnTypeDefBuilder } from "../builder";
import {
  DataPath,
  DataPathInfoGetter,
  dataPathZodSchema,
} from "../../data-path";
import { functions } from "../lib/computedNodeFunctions";
import { TSchema, createDataType } from "../../data-types";
import { Diagnostic, Project, SyntaxKind, ts } from "ts-morph";
import { footprintOfType } from "../lib/typeFootprint";

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

export type CompileTsResult =
  | {
      success: true;
      compiledJs: string;
    }
  | {
      success: false;
      diagnostics: Diagnostic<ts.Diagnostic>[];
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
    const shite = footprintOfType({
      type: type,
      node: node,
    });
    console.log(shite);
  }

  const allDiagnostics = project.getPreEmitDiagnostics();

  // Set compile status based on results

  if (!allDiagnostics.length) {
    const transpiledOutput = ts.transpileModule(finalCode, {
      compilerOptions: {
        ...TS_COMPILER_OPTIONS,
      },
    });
    return {
      success: true,
      compiledJs: transpiledOutput.outputText,
    };
  } else {
    return {
      success: false,
      diagnostics: allDiagnostics,
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
      let msg = compileResult.diagnostics[0]?.getMessageText();
      if (typeof msg === "object") {
        msg = msg.getMessageText();
      }

      return {
        success: false,
        error: `Error compiling TS: ${msg}`,
      };
    }
  })
  .setCreateResolver(({ fnDef, input }) => {
    return async ({ event, getDependency }) => {
      const { depsMap } = input;
      const { compiledJs } = fnDef.config;

      const depValues: Record<string, any> = {};
      for (const [key, depPath] of Object.entries(depsMap)) {
        const featureValue = await getDependency({
          dataPath: depPath,
        });
        depValues[key] = featureValue;
      }

      const functionCode = `
      async function __runCode(inputs, fn) {
        return (${compiledJs})(inputs);
      }
      `;

      const value = await eval(`(${functionCode})`)(depValues, functions);

      return {
        data: value,
      };
    };
  })
  .build();

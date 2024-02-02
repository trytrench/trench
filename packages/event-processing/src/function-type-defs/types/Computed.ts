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
import { Diagnostic, Project, ts } from "ts-morph";

// @ts-ignore
import libSource from "!!raw-loader?esModule=false!../lib/computedNodeLib.ts";

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

  return [libSource, inputTypes, functionType].join("\n\n");
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

  project.createSourceFile("main.ts", finalCode);

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

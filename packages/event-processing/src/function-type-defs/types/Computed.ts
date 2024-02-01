import { z } from "zod";
import { FnType } from "./_enum";
import { createFnTypeDefBuilder } from "../builder";
import { dataPathZodSchema } from "../../data-path";
import { functions } from "../lib/computedNodeFunctions";

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

import { z } from "zod";
import { FnType } from "./_enum";
import { createFnTypeDefBuilder } from "../builder";
import { TypeName, tSchemaZod } from "../../data-types";
import { dataPathZodSchema } from "../../data-path";

export const computedFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.Computed)
  .setInputSchema(
    z.object({
      tsCode: z.string().min(1),
      compiledJs: z.string().min(1),
      depsMap: z.record(z.string(), dataPathZodSchema),
    })
  )
  .setGetDependencies((input) => {
    return new Set(Object.values(input.depsMap).map((path) => path.nodeId));
  })
  .setCreateResolver(({ fnDef, input }) => {
    return async ({ event, getDependency }) => {
      const { depsMap, compiledJs } = input;

      const depValues: Record<string, any> = {};
      for (const [key, depPath] of Object.entries(depsMap)) {
        const featureValue = await getDependency({
          dataPath: depPath,
        });
        depValues[key] = featureValue;
      }

      const value = await eval(`(${compiledJs})`)(depValues);

      return {
        data: value,
      };
    };
  })
  .build();

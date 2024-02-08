import { functions } from "../lib/computedNodeFunctions";
import { createFnTypeResolverBuilder } from "../resolverBuilder";
import { computedFnDef } from "../types/Computed";

export const computedFnResolver = createFnTypeResolverBuilder()
  .setFnTypeDef(computedFnDef)
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

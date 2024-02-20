import { z } from "zod";
import { FnType } from "../enum";
import { createFnTypeDefBuilder } from "../builder";
import {
  Entity,
  TSchema,
  TypeName,
  createDataType,
  tSchemaZod,
} from "../../data-types";
import { getUnixTime } from "date-fns";
import { StoreTable } from "../lib/store";
import { get } from "lodash";
import { dataPathZodSchema } from "../../data-path";
import { printDataPath } from "../lib/print";

export const logEntityFeatureFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.LogEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: tSchemaZod,
    })
  )
  .setInputSchema(
    z.object({
      entityDataPath: dataPathZodSchema.optional(),
      dataPath: dataPathZodSchema,
    })
  )
  .setGetDataPaths((input) => {
    const paths = [input.dataPath];
    if (input.entityDataPath) paths.push(input.entityDataPath);
    return paths;
  })
  .setValidateInputs(({ inputs, fnDef, getDataPathInfo }) => {
    const { featureSchema } = fnDef.config;

    // Check data path
    const { schema: dataPathSchema } = getDataPathInfo(inputs.dataPath);
    if (!dataPathSchema) {
      return {
        success: false,
        error: `Data path ${inputs.dataPath} not found`,
      };
    }

    const featureType = createDataType(featureSchema);
    if (!featureType.canBeAssigned(dataPathSchema)) {
      return {
        success: false,
        error: `Data path of type ${dataPathSchema.type} can't be assigned to feature of type ${featureSchema.type}`,
      };
    }

    // Check entity data path
    if (inputs.entityDataPath) {
      const { schema: entitySchema } = getDataPathInfo(inputs.entityDataPath);

      if (entitySchema?.type !== TypeName.Entity) {
        return {
          success: false,
          error: `Data path ${printDataPath(inputs.dataPath)} is not an entity`,
        };
      }
    }

    return {
      success: true,
    };
  })
  .build();

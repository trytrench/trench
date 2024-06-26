import { z } from "zod";
import { FnType } from "../enum";
import { createFnTypeDefBuilder } from "../builder";
import { TypeName, createDataType } from "../../data-types";
import { ClickhouseClient } from "databases";
import { StoreTable } from "../lib/store";
import { getUnixTime } from "date-fns";
import { create, get } from "lodash";
import { dataPathZodSchema } from "../../data-path";

export const entityAppearanceFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.EntityAppearance)
  .setConfigSchema(
    z.object({
      entityType: z.string(),
    })
  )
  .setInputSchema(
    z.object({
      dataPath: dataPathZodSchema,
    })
  )
  .setGetDataPaths((input) => {
    return [input.dataPath];
  })
  .setReturnSchema<{ type: TypeName.Entity; entityType: string }>()
  .setValidateInputs(({ inputs, fnDef, getDataPathInfo }) => {
    const { dataPath } = inputs;
    const { schema } = getDataPathInfo(dataPath);
    if (!schema) {
      return {
        success: false,
        error: `Data path ${dataPath} not found`,
      };
    }

    const entityType = createDataType({
      type: TypeName.Entity,
      entityType: fnDef.config.entityType,
    });
    const stringType = createDataType({ type: TypeName.String });

    if (
      !stringType.canBeAssigned(schema) &&
      !entityType.canBeAssigned(schema)
    ) {
      return {
        success: false,
        error: `Data path ${dataPath} is not of type ${TypeName.Entity}`,
      };
    }
    return {
      success: true,
    };
  })
  .build();

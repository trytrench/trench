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
import { hashObject } from "../lib/counts";
import { RedisInterface } from "databases";
import { dataPathZodSchema } from "../../data-path";

export const cacheEntityFeatureFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.CacheEntityFeature)
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
  .setContextType<{
    redis: RedisInterface;
  }>()
  .setGetDataPaths((input) => {
    const paths = [input.dataPath];
    if (input.entityDataPath) paths.push(input.entityDataPath);
    return paths;
  })
  .build();

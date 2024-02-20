import { z } from "zod";
import { FnType } from "../enum";
import { createFnTypeDefBuilder } from "../builder";
import { Entity, TSchema, TypeName, createDataType } from "../../data-types";
import { hashObject } from "../lib/counts";
import { RedisInterface } from "databases";
import { dataPathZodSchema } from "../../data-path";

export const getEntityFeatureFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.GetEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: z.record(z.any()),
    })
  )
  .setInputSchema(
    z.object({
      entityDataPath: dataPathZodSchema.optional(),
    })
  )
  .setContextType<{
    redis: RedisInterface;
  }>()
  .setGetDataPaths((config) => {
    const paths = [];
    if (config.entityDataPath) paths.push(config.entityDataPath);
    return paths;
  })
  .build();

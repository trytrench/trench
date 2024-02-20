import { z } from "zod";
import { FnType } from "../enum";
import { createFnTypeDefBuilder } from "../builder";
import { type RedisInterface } from "databases";
import { TypeName } from "../../data-types";
import { DataPath, dataPathZodSchema } from "../../data-path";
import { timeWindowSchema } from "../lib/timeWindow";
import { countArgsSchema } from "../lib/args";

export const uniqueCounterFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.UniqueCounter)
  .setConfigSchema(
    z.object({
      timeWindow: timeWindowSchema,
      countByArgs: countArgsSchema,
      countArgs: countArgsSchema,
    })
  )
  .setInputSchema(
    z.object({
      countByDataPaths: z.array(dataPathZodSchema),
      countDataPaths: z.array(dataPathZodSchema),
      conditionDataPath: dataPathZodSchema.optional(),
    })
  )
  .setGetDataPaths((config) => {
    const arr: DataPath[] = [];
    arr.push(...config.countByDataPaths);
    arr.push(...config.countDataPaths);
    if (config.conditionDataPath) {
      arr.push(config.conditionDataPath);
    }
    return arr;
  })
  .setReturnSchema<{ type: TypeName.Int64 }>()
  .setContextType<{
    redis: RedisInterface;
  }>()
  .build();

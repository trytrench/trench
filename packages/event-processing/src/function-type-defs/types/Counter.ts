import { z } from "zod";
import { FnType } from "../enum";
import { createFnTypeDefBuilder } from "../builder";
import { RedisInterface } from "databases";
import { TypeName } from "../../data-types";
import { DataPath, dataPathZodSchema } from "../../data-path";
import { timeWindowSchema } from "../lib/timeWindow";
import { countArgsSchema } from "../lib/args";

export const counterFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.Counter)
  .setConfigSchema(
    z.object({
      timeWindow: timeWindowSchema,
      countByArgs: countArgsSchema,
    })
  )
  .setInputSchema(
    z.object({
      countByDataPaths: z.array(dataPathZodSchema),
      conditionDataPath: dataPathZodSchema.optional(),
    })
  )
  .setReturnSchema<{ type: TypeName.Int64 }>()
  .setGetDataPaths((config) => {
    const arr: DataPath[] = [];
    arr.push(...config.countByDataPaths);
    if (config.conditionDataPath?.nodeId) {
      arr.push(config.conditionDataPath);
    }
    return arr;
  })
  .setContextType<{
    redis: RedisInterface;
  }>()
  .build();

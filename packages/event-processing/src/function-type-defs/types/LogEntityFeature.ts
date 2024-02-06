import { z } from "zod";
import { FnType } from "./_enum";
import { createFnTypeDefBuilder } from "../builder";
import { Entity, TypeName, createDataType, tSchemaZod } from "../../data-types";
import { getUnixTime } from "date-fns";
import { StoreTable } from "../lib/store";
import { get } from "lodash";
import { dataPathZodSchema } from "../../data-path";
import { FeatureService } from "../services/features";

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
  .setCompileContextType<{
    featureService: FeatureService;
  }>()
  .setValidateInputs(({ inputs, fnDef, ctx, getDataPathInfo }) => {
    const feature = ctx.featureService.getFeatureById(fnDef.config.featureId);
    if (!feature) {
      return {
        success: false,
        error: `Feature with id ${fnDef.config.featureId} not found`,
      };
    }

    // Check data path
    const { schema: dataPathSchema } = getDataPathInfo(inputs.dataPath);
    if (!dataPathSchema) {
      return {
        success: false,
        error: `Data path ${inputs.dataPath} not found`,
      };
    }

    const featureType = createDataType(feature.schema);
    if (!featureType.canBeAssigned(dataPathSchema)) {
      return {
        success: false,
        error: `Data path ${inputs.dataPath} does not match feature schema`,
      };
    }

    // Check entity data path
    if (inputs.entityDataPath) {
      const { schema: entitySchema } = getDataPathInfo(inputs.entityDataPath);

      if (entitySchema?.type !== TypeName.Entity) {
        return {
          success: false,
          error: `Data path ${inputs.dataPath} is not an entity`,
        };
      }
    }

    return {
      success: true,
    };
  })
  .setGetDataPaths((input) => {
    const paths = [input.dataPath];
    if (input.entityDataPath) paths.push(input.entityDataPath);
    return paths;
  })
  .setCreateResolver(({ fnDef, input }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId } = fnDef.config;
      const { entityDataPath, dataPath } = input;

      let assignToEntity: Entity | null = null;

      const baseData = {
        engine_id: engineId,
        created_at: getUnixTime(new Date()),
        event_type: event.type,
        event_id: event.id,
        event_timestamp: getUnixTime(event.timestamp),
        feature_type: fnDef.type,
        feature_id: featureId,
        data_type: fnDef.returnSchema.type,
        is_deleted: 0,
        entity_type: [] as string[],
        entity_id: [] as string[],
      };

      try {
        if (entityDataPath) {
          assignToEntity = await getDependency({
            dataPath: entityDataPath,
            expectedSchema: {
              type: TypeName.Entity,
              entityType: undefined,
            },
          });
          baseData.entity_type.push(assignToEntity.type);
          baseData.entity_id.push(assignToEntity.id);
        }

        const value = await getDependency({
          dataPath: dataPath,
          expectedSchema: {
            type: TypeName.Any,
          },
        });

        const topLevelType = fnDef.returnSchema.type;
        const dataType = createDataType(fnDef.returnSchema);
        const parsedValue = dataType.parse(value);

        const rowToSave = {
          ...baseData,
          value: JSON.stringify(parsedValue),
          value_Int64: topLevelType === TypeName.Int64 ? parsedValue : null,
          value_Float64: topLevelType === TypeName.Float64 ? parsedValue : null,
          value_String:
            topLevelType === TypeName.String || topLevelType === TypeName.Name
              ? parsedValue
              : null,
          value_Bool: topLevelType === TypeName.Boolean ? parsedValue : null,
          error: null,
        };
        return {
          savedStoreRows: [{ table: StoreTable.Features, row: rowToSave }],
          data: parsedValue,
        };
      } catch (e: any) {
        const rowToSave = {
          ...baseData,
          value: null,
          value_Int64: null,
          value_Float64: null,
          value_String: null,
          value_Bool: null,
          error: e.message,
        };
        return {
          savedStoreRows: [{ table: StoreTable.Features, row: rowToSave }],
          data: null,
        };
      }
    };
  })
  .build();

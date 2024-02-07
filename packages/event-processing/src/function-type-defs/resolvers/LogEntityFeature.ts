import { Entity, TypeName, createDataType } from "../../data-types";
import { getUnixTime } from "date-fns";
import { StoreTable } from "../lib/store";
import { createFnTypeResolverBuilder } from "../resolverBuilder";
import { logEntityFeatureFnDef } from "../types/LogEntityFeature";

export const logEntityFeatureFnResolver = createFnTypeResolverBuilder()
  .setFnTypeDef(logEntityFeatureFnDef)
  .setCreateResolver(({ fnDef, input }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId, featureSchema } = fnDef.config;
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
        data_type: featureSchema.type,
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

        const topLevelType = featureSchema.type;
        const dataType = createDataType(featureSchema);
        const parsedValue = dataType.parse(value);

        const isString = createDataType({
          type: TypeName.String,
        }).isSuperTypeOf(featureSchema);

        const rowToSave = {
          ...baseData,
          value: JSON.stringify(parsedValue),
          value_Int64: topLevelType === TypeName.Int64 ? parsedValue : null,
          value_Float64: topLevelType === TypeName.Float64 ? parsedValue : null,
          value_String: isString ? parsedValue : null,
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

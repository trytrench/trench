import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
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

export const logEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.LogEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: tSchemaZod,
      entityDataPath: dataPathZodSchema.optional(),
      dataPath: dataPathZodSchema,
    })
  )
  .setGetDependencies((config) => {
    const set = new Set<string>();
    if (config.entityDataPath) set.add(config.entityDataPath.nodeId);
    set.add(config.dataPath.nodeId);
    return set;
  })
  .setCreateResolver(({ nodeDef }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId, featureSchema, dataPath, entityDataPath } =
        nodeDef.config;

      const { nodeId, path } = dataPath;

      let assignToEntity: Entity | null = null;

      const baseData = {
        engine_id: engineId,
        created_at: getUnixTime(new Date()),
        event_type: event.type,
        event_id: event.id,
        event_timestamp: getUnixTime(event.timestamp),
        feature_type: nodeDef.type,
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

        const rowToSave = {
          ...baseData,
          value: JSON.stringify(parsedValue),
          value_Int64: topLevelType === TypeName.Int64 ? parsedValue : null,
          value_Float64: topLevelType === TypeName.Float64 ? parsedValue : null,
          value_String: topLevelType === TypeName.String ? parsedValue : null,
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

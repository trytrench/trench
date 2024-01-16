import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { Entity, TSchema, TypeName, createDataType } from "../../data-types";
import { getUnixTime } from "date-fns";
import { StoreTable } from "../lib/store";
import { get } from "lodash";

export const logEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.LogEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: z.record(z.any()),
      entityAppearanceNodeId: z.string(),
      dataPath: z.object({
        nodeId: z.string(),
        path: z.array(z.string()).optional(),
      }),
    })
  )
  .setGetDependencies((config) => {
    const set = new Set<string>();
    set.add(config.entityAppearanceNodeId);
    if (config.dataPath.nodeId) {
      set.add(config.dataPath.nodeId);
    }
    return set;
  })
  .setCreateResolver(({ nodeDef }) => {
    return async ({ event, getDependency, engineId }) => {
      const { featureId, featureSchema, dataPath, entityAppearanceNodeId } =
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
        assignToEntity = await getDependency({
          nodeId: entityAppearanceNodeId,
          expectedSchema: {
            type: TypeName.Entity,
          },
        });
        baseData.entity_type.push(assignToEntity.type);
        baseData.entity_id.push(assignToEntity.id);

        const obj = nodeId
          ? await getDependency({
              nodeId: nodeId,
              expectedSchema: {
                type: TypeName.Any,
              },
            })
          : event.data;
        const value = path ? get(obj, path) : obj;

        const topLevelType = featureSchema.type as TypeName;
        const dataType = createDataType(featureSchema as TSchema);
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

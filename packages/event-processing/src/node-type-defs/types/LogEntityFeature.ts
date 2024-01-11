import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { TypeName, createDataType } from "../../data-types";
import { getUnixTime } from "date-fns";
import { StoreTable } from "../lib/store";
import { get } from "lodash";

export const logEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.LogEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: z.any(),
      entityAppearanceNodeId: z.string(),
      valueAccessor: z.object({
        nodeId: z.string().nullable(),
        path: z.string().optional(),
      }),
    })
  )
  .setGetDependencies((config) => {
    const set = new Set<string>();
    set.add(config.entityAppearanceNodeId);
    if (config.valueAccessor.nodeId) {
      set.add(config.valueAccessor.nodeId);
    }
    return set;
  })
  .setReturnSchema({
    type: TypeName.Any,
  })
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency, engineId }) => {
      const {
        featureId,
        featureSchema,
        valueAccessor,
        entityAppearanceNodeId,
      } = nodeDef.config;

      const { nodeId, path } = valueAccessor;
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
      const dataType = createDataType(featureSchema);
      const parsedValue = dataType.parse(value);

      const assignToEntity = await getDependency({
        nodeId: entityAppearanceNodeId,
        expectedSchema: {
          type: TypeName.Entity,
        },
      });

      const rowToSave = {
        engine_id: engineId,
        created_at: getUnixTime(new Date()),
        event_type: event.type,
        event_id: event.id,
        event_timestamp: getUnixTime(event.timestamp),
        feature_type: nodeDef.type,
        feature_id: featureId,
        entity_type: [assignToEntity.type],
        entity_id: [assignToEntity.id],
        data_type: featureSchema.type,
        value: JSON.stringify(parsedValue),
        value_Int64: topLevelType === TypeName.Int64 ? parsedValue : null,
        value_Float64: topLevelType === TypeName.Float64 ? parsedValue : null,
        value_String: topLevelType === TypeName.String ? parsedValue : null,
        value_Bool: topLevelType === TypeName.Boolean ? parsedValue : null,
        error: null,
        is_deleted: 0,
      };

      return {
        savedStoreRows: [{ table: StoreTable.Features, row: rowToSave }],
        data: parsedValue,
      };
    };
  })
  .build();

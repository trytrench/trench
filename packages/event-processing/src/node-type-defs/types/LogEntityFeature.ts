import { z } from "zod";
import { NodeType } from "./_enum";
import { printNodeDef } from "../lib/print";
import { createNodeTypeDefBuilder } from "../builder";
import { type ClickhouseClient } from "databases";
import { TypeName, createDataType } from "../../data-types";
import { getUnixTime } from "date-fns";

export const logEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.LogEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      featureSchema: z.any(),
      entityAppearanceNodeId: z.string(),
      valueAccessor: z.object({
        nodeId: z.string(),
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
  .setContextType<{ clickhouse: ClickhouseClient }>()
  .setCreateResolver(({ nodeDef, context }) => {
    const db = context.clickhouse;

    return async ({ event, getDependency, engineId }) => {
      const {
        featureId,
        featureSchema,
        valueAccessor,
        entityAppearanceNodeId,
      } = nodeDef.config;

      const value = await getDependency({
        nodeId: valueAccessor.nodeId,
        expectedSchema: {
          type: TypeName.Any,
        },
      });

      const topLevelType = featureSchema.type as TypeName;
      const dataType = createDataType(featureSchema);
      const parsedValue = dataType.parse(value);

      const assignToEntity = await getDependency({
        nodeId: entityAppearanceNodeId,
        expectedSchema: {
          type: TypeName.Entity,
        },
      });

      const stateUpdater = async () => {
        const data = {
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
          value: JSON.stringify(value),
          value_Int64: topLevelType === TypeName.Int64 ? parsedValue : null,
          value_Float64: topLevelType === TypeName.Float64 ? parsedValue : null,
          value_String: topLevelType === TypeName.String ? parsedValue : null,
          value_Bool: topLevelType === TypeName.Boolean ? parsedValue : null,
          error: null,
          is_deleted: 0,
        };

        await db.insert({
          table: "features",
          values: [data],
          format: "JSONEachRow",
          clickhouse_settings: {
            async_insert: 1,
          },
        });
      };

      return {
        stateUpdaters: [stateUpdater],
        data: parsedValue,
      };
    };
  })
  .build();

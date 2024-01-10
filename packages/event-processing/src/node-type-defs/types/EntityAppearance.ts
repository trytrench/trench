import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { TypeName } from "../../data-types";
import { ClickhouseClient } from "databases";
import { insertFeatureRow } from "../lib/store";
import { getUnixTime } from "date-fns";

export const entityAppearanceNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.EntityAppearance)
  .setConfigSchema(
    z.object({
      entityType: z.string(),
      valueAccessor: z.object({
        nodeId: z.string(),
        path: z.string().optional(),
      }),
    })
  )
  .setContextType<{ clickhouse: ClickhouseClient }>()
  .setReturnSchema({
    type: TypeName.Entity,
  })
  .setCreateResolver(({ nodeDef, context }) => {
    const db = context.clickhouse;
    return async ({ event, getDependency, engineId }) => {
      // Access node value
      const { valueAccessor } = nodeDef.config;
      const obj = await getDependency({
        nodeId: valueAccessor.nodeId,
        expectedSchema: {
          type: TypeName.Any,
        },
      });

      const value = valueAccessor.path ? obj[valueAccessor.path] : obj;

      if (typeof value !== "string") {
        throw new Error(
          `Expected string value for entity id, got ${typeof value}`
        );
      }

      const entity = {
        type: nodeDef.config.entityType,
        id: value,
      };

      const stateUpdater = async () => {
        await insertFeatureRow(db, {
          engine_id: engineId,
          created_at: getUnixTime(new Date()),
          event_type: event.type,
          event_id: event.id,
          event_timestamp: getUnixTime(event.timestamp),
          feature_type: nodeDef.type,
          feature_id: "entity_appearance",
          entity_type: [entity.type],
          entity_id: [entity.id],
          data_type: TypeName.Entity,
          value: JSON.stringify(value),
          value_Int64: null,
          value_Float64: null,
          value_String: null,
          value_Bool: null,
          error: null,
          is_deleted: 0,
        });
      };

      return {
        stateUpdaters: [stateUpdater],
        data: entity,
      };
    };
  })
  .build();

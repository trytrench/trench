import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { TypeName } from "../../data-types";
import { ClickhouseClient } from "databases";
import { StoreTable } from "../lib/store";
import { getUnixTime } from "date-fns";
import { get } from "lodash";
import { dataPathZodSchema } from "../../data-path";

export const entityAppearanceNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.EntityAppearance)
  .setConfigSchema(
    z.object({
      entityType: z.string(),
      dataPath: dataPathZodSchema,
    })
  )
  .setGetDependencies((config) => {
    const result = new Set<string>();
    result.add(config.dataPath.nodeId);
    return result;
  })
  .setReturnSchema(TypeName.Entity)
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency, engineId }) => {
      // Access node value
      const { dataPath } = nodeDef.config;
      const value = await getDependency({
        dataPath,
        expectedSchema: {
          type: TypeName.String,
        },
      });

      const entity = {
        type: nodeDef.config.entityType,
        id: value,
      };

      const rowToSave = {
        engine_id: engineId,
        created_at: getUnixTime(new Date()),
        event_type: event.type,
        event_id: event.id,
        event_timestamp: getUnixTime(event.timestamp),
        feature_type: nodeDef.type,
        feature_id: entity.type,
        entity_type: [entity.type],
        entity_id: [entity.id],
        data_type: TypeName.Entity,
        value: JSON.stringify(entity),
        value_Int64: null,
        value_Float64: null,
        value_String: null,
        value_Bool: null,
        error: null,
        is_deleted: 0,
      };

      return {
        savedStoreRows: [{ table: StoreTable.Features, row: rowToSave }],
        data: entity,
      };
    };
  })
  .build();

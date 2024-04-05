import { z } from "zod";
import { FnType } from "../enum";
import { createFnTypeDefBuilder } from "../builder";
import { TypeName, createDataType } from "../../data-types";
import { ClickhouseClient } from "databases";
import { StoreRow, StoreRowMap, StoreTable } from "../lib/store";
import { getUnixTime } from "date-fns";
import { get } from "lodash";
import { dataPathZodSchema } from "../../data-path";
import { createFnTypeResolverBuilder } from "../resolverBuilder";
import { entityAppearanceFnDef } from "../types/EntityAppearance";

export const entityAppearanceFnResolver = createFnTypeResolverBuilder()
  .setFnTypeDef(entityAppearanceFnDef)
  .setCreateResolver(({ fnDef, input, context }) => {
    return async ({ event, getDependency, engineId }) => {
      // Access node value
      const { entityType } = fnDef.config;
      const { dataPath } = input;
      const value = await getDependency({
        dataPath,
      });

      let entity;
      if (!value) {
        throw new Error(`Expected a entity ID value at dataPath ${dataPath}`);
      }
      if (typeof value === "string") {
        entity = {
          type: entityType,
          id: value,
        };
      } else if (typeof value === "number") {
        entity = {
          type: entityType,
          id: value.toString(),
        };
      } else if (
        typeof value === "object" &&
        value.hasOwnProperty("type") &&
        value.hasOwnProperty("id") &&
        value.type === entityType
      ) {
        entity = {
          type: entityType,
          id: value.id,
        };
      } else {
        throw new Error(
          `Expected a string or number id, or entity, but got ${typeof value}`
        );
      }

      const rowToSave: StoreRowMap[StoreTable.Features] = {
        engine_id: engineId,
        created_at: new Date().getTime(),
        event_type: event.type,
        event_id: event.id,
        event_timestamp: event.timestamp.getTime(),
        feature_type: FnType.EntityAppearance,
        feature_id: entity.type,
        entity_type: entity.type,
        entity_id: entity.id,
        unique_entity_id: `${entity.type}_${entity.id}`,
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

import { z } from "zod";
import { DataType, Entity } from "../../dataTypes";
import { NodeType } from "./_enum";
import { printNodeDef } from "../lib/print";
import { createNodeTypeDefBuilder } from "../builder";
import { type ClickhouseClient } from "databases";

export const getEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.GetEntityFeature)
  .setConfigSchema(
    z.object({
      entityKeyNodeIds: z.array(z.string()),
      featureId: z.string(),
    })
  )
  .setAllowedDataTypes([
    DataType.Int64,
    DataType.Float64,
    DataType.Boolean,
    DataType.Entity,
    DataType.String,
  ])
  .setContextType<{ clickhouse: ClickhouseClient }>()
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency }) => {
      return {
        stateUpdaters: [],
        data: {
          type: DataType.String,
          value: "test",
        },
      };
    };
  })
  .build();

import { z } from "zod";
import { NodeType } from "./_enum";
import { printNodeDef } from "../lib/print";
import { createNodeTypeDefBuilder } from "../builder";
import { type ClickhouseClient } from "databases";
import { TypeName } from "../../data-types";

export const getEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.GetEntityFeature)
  .setConfigSchema(
    z.object({
      entityKeyNodeIds: z.array(z.string()),
      featureId: z.string(),
    })
  )
  .setReturnSchema({
    type: TypeName.Any,
  })
  .setContextType<{ clickhouse: ClickhouseClient }>()
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency }) => {
      return {
        stateUpdaters: [],
        data: "test",
      };
    };
  })
  .build();

import { z } from "zod";
import { NodeType } from "./_enum";
import { printNodeDef } from "../lib/print";
import { createNodeTypeDefBuilder } from "../builder";
import { type ClickhouseClient } from "databases";
import { TypeName } from "../../data-types";

export const logEntityFeatureNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.LogEntityFeature)
  .setConfigSchema(
    z.object({
      featureId: z.string(),
      entityAppearanceNodeId: z.string(),
      accessor: z.object({
        nodeId: z.string().nullable(),
        path: z.string().optional(),
      }),
    })
  )
  .setGetDependencies((config) => {
    const set = new Set<string>();
    set.add(config.entityAppearanceNodeId);
    if (config.accessor.nodeId) {
      set.add(config.accessor.nodeId);
    }
    return set;
  })
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

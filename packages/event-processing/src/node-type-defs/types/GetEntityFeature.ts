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
      entityAppearanceNodeId: z.string(),
      featureId: z.string(),
    })
  )
  .setGetDependencies((config) => {
    const set = new Set<string>();
    set.add(config.entityAppearanceNodeId);
    return set;
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

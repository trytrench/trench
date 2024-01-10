import { z } from "zod";
import { NodeType } from "./_enum";
import { printNodeDef } from "../lib/print";
import { createNodeTypeDefBuilder } from "../builder";
import { type ClickhouseClient } from "databases";
import { TypeName } from "../../data-types";

export const entityAppearanceNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.EntityAppearance)
  .setConfigSchema(
    z.object({
      entityType: z.string(),
      accessor: z.object({
        nodeId: z.string(),
        path: z.string().optional(),
      }),
    })
  )
  .setReturnSchema({
    type: TypeName.Entity,
  })
  .setContextType<{ clickhouse: ClickhouseClient }>()
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency }) => {
      return {
        stateUpdaters: [],
        data: {
          type: nodeDef.config.entityType,
          id: "",
        },
      };
    };
  })
  .build();

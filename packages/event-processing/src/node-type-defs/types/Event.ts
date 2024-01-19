import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";

export const eventNodeDef = createNodeTypeDefBuilder()
  .setNodeType(NodeType.Event)
  .setConfigSchema(z.object({}))
  .setCreateResolver(({ nodeDef }) => {
    return async ({ event, getDependency }) => {
      return {
        data: event,
      };
    };
  })
  .build();

import { z } from "zod";
import { NodeType } from "./_enum";
import { createNodeTypeDefBuilder } from "../builder";
import { TypeName } from "../../data-types";

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
  .setReturnSchema({
    type: TypeName.Entity,
  })
  .setCreateResolver(({ nodeDef, context }) => {
    return async ({ event, getDependency }) => {
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

      return {
        stateUpdaters: [],
        data: {
          type: nodeDef.config.entityType,
          id: value,
        },
      };
    };
  })
  .build();

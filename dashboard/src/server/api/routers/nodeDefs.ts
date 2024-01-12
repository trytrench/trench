import { GlobalStateKey } from "databases";
import { NODE_TYPE_DEFS, NodeDefsMap, NodeType } from "event-processing";
import { createDataType } from "event-processing/src/data-types";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const nodeDefsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return ctx.prisma.node.findUniqueOrThrow({
        where: {
          id: input.id,
        },
      }) as unknown as NodeDefsMap[keyof NodeDefsMap];
    }),

  list: protectedProcedure
    .input(
      z.object({
        eventTypeId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const nodeDefs = await ctx.prisma.node.findMany({
        where: {
          eventTypes: input.eventTypeId
            ? { has: input.eventTypeId }
            : undefined,
        },
      });

      return nodeDefs.map(
        (nodeDef) => nodeDef as unknown as NodeDefsMap[keyof NodeDefsMap]
      );
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.nativeEnum(NodeType),
        eventTypes: z.array(z.string()),
        dependsOn: z.array(z.string()),
        config: z.record(z.any()),
        returnSchema: z.record(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { configSchema } = NODE_TYPE_DEFS[input.type];
      configSchema.parse(input.config);

      const nodeDef = await ctx.prisma.node.create({ data: input });

      // Publish
      const nodeDefs = await ctx.prisma.node.findMany();

      const engine = await ctx.prisma.executionEngine.create({
        data: {
          nodes: {
            createMany: {
              data: nodeDefs.map((nodeDef) => ({
                nodeId: nodeDef.id,
              })),
            },
          },
        },
      });

      await ctx.prisma.globalState.upsert({
        where: {
          key: GlobalStateKey.ActiveEngineId,
        },
        create: {
          key: GlobalStateKey.ActiveEngineId,
          value: engine.id,
        },
        update: {
          value: engine.id,
        },
      });

      return nodeDef;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        dependsOn: z.array(z.string()).optional(),
        eventTypes: z.array(z.string()).optional(),
        config: z.record(z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
      });

      const { configSchema } = NODE_TYPE_DEFS[nodeDef.type as NodeType];
      configSchema.parse(input.config);

      return ctx.prisma.node.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
          dependsOn: input.dependsOn,
          config: input.config,
          eventTypes: input.eventTypes,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.delete({
        where: { id: input.id },
      });
    }),
});

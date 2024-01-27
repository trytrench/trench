import { GlobalStateKey, prisma } from "databases";
import {
  FN_TYPE_REGISTRY,
  FnType,
  type NodeDef,
  bareNodeDefSchema,
  fnDefSchema,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  FN_INCLUDE_ARGS,
  NODE_INCLUDE_ARGS,
  prismaFnToFnDef,
  prismaNodeToNodeDef,
} from "../../lib/prismaConverters";
import { type Prisma } from "@prisma/client";
import { publish } from "../../lib/nodes/publish";

export const nodeDefsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
        include: NODE_INCLUDE_ARGS,
      });
      return prismaNodeToNodeDef(nodeDef);
    }),

  list: protectedProcedure
    .input(z.object({ eventType: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const nodes = await ctx.prisma.node.findMany({
        where: { eventType: input?.eventType },
        include: NODE_INCLUDE_ARGS,
      });
      return nodes.map(prismaNodeToNodeDef);
    }),

  createWithFn: protectedProcedure
    .input(
      bareNodeDefSchema
        .omit({ id: true, dependsOn: true, snapshotId: true })
        .merge(z.object({ fn: fnDefSchema.omit({ id: true }) }))
    )
    .mutation(async ({ ctx, input }) => {
      const { fn } = input;
      const result = await ctx.prisma.fn.create({
        data: {
          type: fn.type,
          name: fn.name,
          snapshots: {
            create: {
              config: fn.config as unknown as any,
              returnSchema: fn.returnSchema as unknown as any,
            },
          },
        },
        include: FN_INCLUDE_ARGS,
      });
      const createdFnDef = prismaFnToFnDef(result);

      // Validate inputs based on function
      const { getDependencies, inputSchema } =
        FN_TYPE_REGISTRY[createdFnDef.type];
      const dependsOn = getDependencies(input.inputs);
      inputSchema.parse(input.inputs);

      const newNodeDef = await ctx.prisma.node.create({
        data: {
          eventType: input.eventType,
          name: input.name,
          fnId: createdFnDef.id,
          snapshots: {
            create: {
              dependsOn: Array.from(dependsOn),
              inputs: input.inputs as unknown as any,
              fnSnapshot: {
                connect: { id: createdFnDef.snapshotId },
              },
            },
          },
        },
        include: NODE_INCLUDE_ARGS,
      });

      // Only publish engine if function is "important"
      const UNIMPORTANT_FN_TYPES = [FnType.GetEntityFeature];
      if (!UNIMPORTANT_FN_TYPES.includes(createdFnDef.type)) {
        await publish();
      }

      return prismaNodeToNodeDef(newNodeDef);
    }),

  create: protectedProcedure
    .input(
      bareNodeDefSchema
        .omit({ id: true, dependsOn: true, snapshotId: true })
        .merge(z.object({ fnId: z.string() }))
    )
    .mutation(async ({ ctx, input }) => {
      // Grab latest function definition
      const _func = await ctx.prisma.fn.findUniqueOrThrow({
        where: { id: input.fnId },
        include: FN_INCLUDE_ARGS,
      });
      const fnDef = prismaFnToFnDef(_func);

      // Validate node inputs using function definition
      const { getDependencies, inputSchema } = FN_TYPE_REGISTRY[fnDef.type];
      const dependsOn = getDependencies(input.inputs);
      inputSchema.parse(input.inputs);

      // Only publish engine if function is "important"
      // (i.e. function does something that tangibly affects engine output.
      //  for example, GetEntityFeature doesn't affect engine output unless
      //  it's used by another function)
      const UNIMPORTANT_FN_TYPES = [FnType.GetEntityFeature];
      if (!UNIMPORTANT_FN_TYPES.includes(fnDef.type)) {
        await publish();
      }

      const nodeDef = await ctx.prisma.node.create({
        data: {
          eventType: input.eventType,
          name: input.name,
          fnId: fnDef.id,
          snapshots: {
            create: {
              dependsOn: Array.from(dependsOn),
              inputs: input.inputs as unknown as any,
              fnSnapshot: {
                connect: { id: fnDef.snapshotId },
              },
            },
          },
        },
        include: NODE_INCLUDE_ARGS,
      });

      return prismaNodeToNodeDef(nodeDef);
    }),

  update: protectedProcedure
    .input(
      bareNodeDefSchema
        .pick({
          // Pick updatable fields
          name: true,
          inputs: true,
        })
        .partial()
        .merge(z.object({ id: z.string(), fnId: z.string().optional() }))
    )
    .mutation(async ({ ctx, input }) => {
      const _rawNode = await ctx.prisma.node.findUniqueOrThrow({
        where: { id: input.id },
        include: NODE_INCLUDE_ARGS,
      });
      const originalNodeDef = prismaNodeToNodeDef(_rawNode);

      async function createNewSnapshotArgs(): Promise<Omit<
        Prisma.NodeSnapshotCreateInput,
        "node"
      > | null> {
        if (!input.inputs && !input.fnId) return null;
        if (input.fnId === originalNodeDef.fn.id) return null;

        const fnDef = input.fnId
          ? prismaFnToFnDef(
              await ctx.prisma.fn.findUniqueOrThrow({
                where: { id: input.fnId },
                include: FN_INCLUDE_ARGS,
              })
            )
          : originalNodeDef.fn;

        const { inputSchema, getDependencies } = FN_TYPE_REGISTRY[fnDef.type];
        inputSchema.parse(input.inputs);

        const newInputs = input.inputs ?? originalNodeDef.inputs;
        const dependsOn = getDependencies(newInputs);

        return {
          dependsOn: Array.from(dependsOn),
          inputs: newInputs,
          fnSnapshot: {
            connect: { id: fnDef.snapshotId },
          },
        };
      }

      const newSnapshotArgs = await createNewSnapshotArgs();

      const updatedNodeDef = await ctx.prisma.node.update({
        where: { id: input.id },
        data: {
          name: input.name,
          fnId: input.fnId ?? originalNodeDef.fn.id,
          snapshots: newSnapshotArgs ? { create: newSnapshotArgs } : undefined,
        },
        include: NODE_INCLUDE_ARGS,
      });

      return prismaNodeToNodeDef(updatedNodeDef);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.node.delete({
        where: { id: input.id },
      });
    }),
});

import { GlobalStateKey, prisma } from "databases";
import {
  FN_TYPE_REGISTRY,
  type FnDef,
  FnType,
  type TSchema,
  type NodeDef,
  bareNodeDefSchema,
  fnDefSchema,
} from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  FN_INCLUDE_ARGS,
  NODE_INCLUDE_ARGS,
  prismaFnSnapshotToFnDef,
  prismaFnToFnDef,
  prismaNodeToNodeDef,
} from "../../lib/prismaConverters";
import { type Prisma } from "@prisma/client";
import { publish } from "../../lib/nodes/publish";
import {
  updateFnDef,
  updateFnDefArgsSchema,
} from "../../lib/nodes/updateFnDef";

export const fnDefsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.fn.findUniqueOrThrow({
        where: { id: input.id },
        include: FN_INCLUDE_ARGS,
      });
      return prismaFnToFnDef(nodeDef);
    }),

  list: protectedProcedure
    .input(z.object({ type: z.nativeEnum(FnType).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const fns = await ctx.prisma.fn.findMany({
        where: { type: input?.type },
        include: FN_INCLUDE_ARGS,
      });
      return fns.map(prismaFnToFnDef);
    }),

  create: protectedProcedure
    .input(fnDefSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.fn.create({
        data: {
          name: input.name,
          type: input.type,
          snapshots: {
            create: {
              config: input.config as unknown as any,
              returnSchema: input.returnSchema as unknown as any,
            },
          },
        },
        include: FN_INCLUDE_ARGS,
      });
      return prismaFnToFnDef(result);
    }),

  update: protectedProcedure
    .input(updateFnDefArgsSchema)
    .mutation(async ({ ctx, input }) => {
      return updateFnDef(input);
    }),
});

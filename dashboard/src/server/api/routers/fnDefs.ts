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
import { prismaToFnDef, prismaToNodeDef } from "../../lib/prismaConverters";
import { type Prisma } from "@prisma/client";

export const fnDefsRouter = createTRPCRouter({
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const nodeDef = await ctx.prisma.function.findUniqueOrThrow({
        where: { id: input.id },
      });
      return prismaToFnDef(nodeDef);
    }),

  list: protectedProcedure
    .input(z.object({ type: z.nativeEnum(FnType).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const fns = await ctx.prisma.function.findMany({
        where: { type: input?.type },
      });
      return fns.map(prismaToFnDef);
    }),

  create: protectedProcedure
    .input(fnDefSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.prisma.function.create({
        data: {
          ...input,
          returnSchema: input.returnSchema as unknown as any,
        },
      });
      return prismaToFnDef(result);
    }),

  // update: protectedProcedure
  //   .input(fnDefSchema.partial())
  //   .mutation(async ({ ctx, input }) => {
  //     if (!input.id) throw new Error("Missing id");

  //     const result = await ctx.prisma.function.update({
  //       where: { id: input.id },
  //       data: {
  //         ...input,
  //         returnSchema: input.returnSchema as unknown as any,
  //       },
  //     });
  //     return prismaToFnDef(result);
  //   }),
});

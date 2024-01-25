import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const decisionsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.decision.findMany();
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.enum(["block", "allow", "watch"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.decision.create({
        data: {
          name: input.name,
          type: input.type,
        },
      });
    }),
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.decision.delete({
        where: {
          id: input.id,
        },
      });
    }),
});

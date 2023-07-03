import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const userFlowsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.userFlow.findMany();
  }),
});

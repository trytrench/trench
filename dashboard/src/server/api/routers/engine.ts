import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const engineRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx, input }) => {
    const engineData = ctx.prisma.executionEngine.findMany({
      include: {
        nodeSnapshots: {
          include: {
            nodeSnapshot: {
              include: {
                node: true,
              },
            },
          },
        },
      },
    });
  }),
});

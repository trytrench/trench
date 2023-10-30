import { DatasetType } from "databases";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const datasetsRouter = createTRPCRouter({
  list: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.dataset.findMany();
  }),
  get: publicProcedure
    .input(z.object({ id: z.bigint() }))
    .query(({ ctx, input }) => {
      return ctx.prisma.dataset.findUnique({
        where: { id: input.id },
        include: {},
      });
    }),
  create: publicProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string(),
        description: z.string().optional(),
        type: z.nativeEnum(DatasetType),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, description, type, projectId } = input;
      return ctx.prisma.dataset.create({
        data: {
          name,
          description,
          type,
          projectId: projectId,
        },
      });
    }),
});

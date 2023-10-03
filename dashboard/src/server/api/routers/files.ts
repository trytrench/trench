import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const filesRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        rulesetId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.file.findMany({
        include: {
          currentFileSnapshot: true,
          fileSnapshots: true,
        },
        where: {
          currentFileSnapshot: {
            rulesetId: input.rulesetId,
          },
        },
      });
    }),
  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.file.findUniqueOrThrow({
        where: {
          id: input.id,
        },
        include: {
          currentFileSnapshot: true,
        },
      });
    }),
  publish: publicProcedure
    .input(
      z.object({
        id: z.string(),
        code: z.string(),
        description: z.string().optional(),
        version: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.file.update({
        where: {
          id: input.id,
        },
        data: {
          currentFileSnapshot: {
            create: {
              code: input.code,
              description: input.description,
              version: input.version,
              file: {
                connect: { id: input.id },
              },
            },
          },
        },
      });

      return file;
    }),
  create: publicProcedure
    .input(
      z.object({
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.file.create({
        data: {
          name: input.name,
          currentFileSnapshot: {
            create: {
              code: "",
              version: "0.0.0",
            },
          },
        },
      });

      await ctx.prisma.fileSnapshot.update({
        where: {
          id: file.currentFileSnapshotId,
        },
        data: {
          file: {
            connect: {
              id: file.id,
            },
          },
        },
      });

      return file;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.file.delete({
        where: {
          id: input.id,
        },
      });

      return file;
    }),
  rename: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const file = await ctx.prisma.file.update({
        where: {
          id: input.id,
        },
        data: {
          name: input.name,
        },
      });

      return file;
    }),
});

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const justDatasetId = z
  .object({
    datasetId: z.number().default(0),
  })
  .default({});

const whereDataset = (datasetId: number) => ({
  where: {
    datasetId: datasetId,
  },
});

export const labelsRouter = createTRPCRouter({
  getAllLabels: publicProcedure
    .input(justDatasetId)
    .query(async ({ ctx, input }) => {
      const [eventLabels, entityLabels] = await ctx.prisma.$transaction([
        ctx.prisma.eventLabel.findMany(whereDataset(input.datasetId)),
        ctx.prisma.entityLabel.findMany(whereDataset(input.datasetId)),
      ]);

      return {
        eventLabels,
        entityLabels,
      };
    }),

  getEventLabels: publicProcedure
    .input(
      z
        .object({
          eventType: z.string().optional(),
          datasetId: z.number().default(0),
        })
        .default({})
    )
    .query(async ({ ctx, input }) => {
      const eventType = input?.eventType;

      return ctx.prisma.eventLabel.findMany({
        where: {
          eventType,
          datasetId: input.datasetId,
        },
      });
    }),

  getEntityLabels: publicProcedure
    .input(
      z
        .object({
          entityType: z.string().optional(),
          datasetId: z.number().default(0),
        })
        .default({})
    )
    .query(async ({ ctx, input }) => {
      const entityType = input?.entityType;

      return ctx.prisma.entityLabel.findMany({
        where: {
          entityType,
          datasetId: input.datasetId,
        },
      });
    }),

  getEventTypes: publicProcedure
    .input(justDatasetId)
    .query(async ({ ctx, input }) => {
      return ctx.prisma.eventType.findMany(whereDataset(input.datasetId));
    }),
  getEntityTypes: publicProcedure
    .input(justDatasetId)
    .query(async ({ ctx, input }) => {
      return ctx.prisma.entityType.findMany(whereDataset(input.datasetId));
    }),
  getLinkTypes: publicProcedure
    .input(justDatasetId)
    .query(async ({ ctx, input }) => {
      return ctx.prisma.linkType.findMany(whereDataset(input.datasetId));
    }),
  getEntityFeatures: publicProcedure
    .input(
      z
        .object({
          entityType: z.string().optional(),
          datasetId: z.number().default(0),
        })
        .default({})
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.entityFeature.findMany({
        where: {
          entityType: input.entityType,
          datasetId: input.datasetId,
        },
      });
    }),
  getEventFeatures: publicProcedure
    .input(
      z
        .object({
          eventType: z.string().optional(),
          datasetId: z.number().default(0),
        })
        .default({})
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.eventFeature.findMany({
        where: {
          eventType: input.eventType,
          datasetId: input.datasetId,
        },
      });
    }),
});

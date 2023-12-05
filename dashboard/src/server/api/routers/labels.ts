import { db } from "databases";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const labelsRouter = createTRPCRouter({
  getEventTypes: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUniqueOrThrow({
        where: { id: input.projectId },
      });

      const eventTypes = await ctx.prisma.eventType.findMany({
        where: { projectId: input.projectId },
      });

      const result = await db.query({
        query: `
          SELECT DISTINCT event_type
          FROM event_entity
          WHERE dataset_id = '${project.productionDatasetId}'
          ORDER BY event_type ASC
        `,
        format: "JSONEachRow",
      });
      const types = await result.json<{ event_type: string }[]>();
      return types.map(
        (type) =>
          eventTypes.find(
            (eventType) => eventType.type === type.event_type
          ) ?? {
            type: type.event_type,
            featureOrder: [],
          }
      );
    }),
  getEntityTypes: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.entityType.findMany({
        where: {
          projectId: input.projectId,
        },
        include: {
          nameFeature: {
            include: {
              feature: true,
            },
          },
        },
      });
    }),
  getFeatures: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.feature.findMany({
        where: {
          projectId: input.projectId,
        },
      });
    }),
  getEventFeatures: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.eventFeature.findMany({
        where: { feature: { projectId: input.projectId } },
        include: {
          eventType: true,
          feature: true,
        },
      });
    }),
  getEntityFeatures: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.entityFeature.findMany({
        where: { feature: { projectId: input.projectId } },
        include: {
          entityType: true,
          feature: true,
        },
      });
    }),
  saveEventType: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        type: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.eventType.upsert({
        where: {
          type_projectId: {
            type: input.type,
            projectId: input.projectId,
          },
        },
        create: {
          type: input.type,
          projectId: input.projectId,
        },
        update: {},
      });
    }),
});

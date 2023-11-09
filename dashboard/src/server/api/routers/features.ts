import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const featuresRouter = createTRPCRouter({
  saveEntityFeature: publicProcedure
    .input(
      z.object({
        featureId: z.string(),
        entityTypeId: z.string(),
        name: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.entityFeature.upsert({
        where: {
          entityTypeId_featureId: {
            entityTypeId: input.entityTypeId,
            featureId: input.featureId,
          },
        },
        create: {
          entityTypeId: input.entityTypeId,
          featureId: input.featureId,
          name: input.name,
          color: input.color,
        },
        update: {
          name: input.name,
          color: input.color,
        },
      });
    }),

  saveEventFeature: publicProcedure
    .input(
      z.object({
        featureId: z.string(),
        eventTypeId: z.string(),
        name: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.eventFeature.upsert({
        where: {
          eventTypeId_featureId: {
            eventTypeId: input.eventTypeId,
            featureId: input.featureId,
          },
        },
        create: {
          eventTypeId: input.eventTypeId,
          featureId: input.featureId,
          name: input.name,
          color: input.color,
        },
        update: {
          name: input.name,
          color: input.color,
        },
      });
    }),

  saveFeature: publicProcedure
    .input(
      z.object({
        featureId: z.string(),
        dataType: z.enum(["text", "number", "boolean", "entity"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const feature = await ctx.prisma.feature.update({
        where: {
          id: input.featureId,
        },
        data: {
          dataType: input.dataType,
        },
      });
      return feature;
    }),

  saveEntityFeatureOrder: publicProcedure
    .input(
      z.object({
        features: z.string().array(),
        projectId: z.string(),
        entityType: z.string(),
        isRule: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.entityType.update({
        where: {
          type_projectId: {
            type: input.entityType,
            projectId: input.projectId,
          },
        },
        data: input.isRule
          ? { ruleOrder: input.features }
          : { featureOrder: input.features },
      });
    }),

  saveEventFeatureOrder: publicProcedure
    .input(
      z.object({
        features: z.string().array(),
        projectId: z.string(),
        eventType: z.string(),
        isRule: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.eventType.upsert({
        where: {
          type_projectId: {
            type: input.eventType,
            projectId: input.projectId,
          },
        },
        create: {
          ...(input.isRule
            ? { ruleOrder: input.features }
            : { featureOrder: input.features }),
          type: input.eventType,
          projectId: input.projectId,
        },
        update: input.isRule
          ? { ruleOrder: input.features }
          : { featureOrder: input.features },
      });
    }),
});

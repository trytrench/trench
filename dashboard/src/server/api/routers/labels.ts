import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";

export const labelsRouter = createTRPCRouter({
  getAllLabels: publicProcedure.query(async ({ ctx, input }) => {
    const [eventLabels, entityLabels] = await ctx.prisma.$transaction([
      ctx.prisma.eventLabel.findMany(),
      ctx.prisma.entityLabel.findMany(),
    ]);

    return {
      eventLabels,
      entityLabels,
    };
  }),
  getEventLabels: publicProcedure
    .input(
      z.object({
        eventType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const result = await db.query({
        query: `
          SELECT DISTINCT label
          FROM event_labels
          WHERE event_type = '${input.eventType}' OR 1=1;
        `,
        format: "JSONEachRow",
      });
      const data = await result.json<{ label: string }[]>();
      return data.map((row) => row.label);
    }),
  getEntityLabels: publicProcedure
    .input(
      z
        .object({
          entityType: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const entityType = input?.entityType;

      return ctx.prisma.entityLabel.findMany({
        where: {
          entityType,
        },
      });
    }),
  getEventTypes: publicProcedure.query(async ({ ctx }) => {
    const result = await db.query({
      query: `
          SELECT DISTINCT event_type
          FROM event_entity;
        `,
      format: "JSONEachRow",
    });
    const types = await result.json<{ event_type: string }[]>();
    return types.map((type) => type.event_type);
  }),
  getEntityTypes: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.entityType.findMany();
  }),
  getLinkTypes: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.linkType.findMany();
  }),
  getEntityFeatures: publicProcedure
    .input(z.object({ entityType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.entityFeature.findMany({
        where: {
          entityType: input.entityType,
        },
      });
    }),
  getEventFeatures: publicProcedure
    .input(z.object({ eventType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const result = await db.query({
        query: `
          SELECT DISTINCT feature
          FROM
          (
              SELECT JSONExtractKeys(toJSONString(event_features)) AS feature
              FROM event_entity
          );
        `,
        format: "JSONEachRow",
      });
      const features = await result.json<{ feature: string }[]>();
      return features.flatMap((feature) => feature.feature);
    }),
});

import { TypeName } from "event-processing";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

const ruleSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  eventTypeId: z.string().optional(),
  entityTypeId: z.string().optional(),
});

export const rulesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx, input }) => {
    return ctx.prisma.rule.findMany({
      include: {
        feature: true,
      },
    });
  }),
  create: protectedProcedure
    .input(ruleSchema.omit({ id: true }))
    .mutation(async ({ ctx, input }) => {
      const feature = await ctx.prisma.rule.create({
        data: {
          color: input.color,
          feature: {
            create: {
              name: input.name,
              eventTypeId: input.eventTypeId,
              entityTypeId: input.entityTypeId,
              schema: { type: TypeName.Boolean },
            },
          },
        },
        include: {
          feature: true,
        },
      });

      return feature;
    }),

  update: protectedProcedure

    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const rule = await ctx.prisma.rule.update({
        where: {
          id: input.id,
        },
        data: {
          color: input.color,
          feature: {
            update: {
              name: input.name,
            },
          },
        },
      });

      return rule;
    }),
});

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { stripe } from "../../../lib/stripe";

export const verificationsRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        offset: z.number().optional(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const [count, rows] = await ctx.prisma.$transaction([
        ctx.prisma.kycAttempt.count(),
        ctx.prisma.kycAttempt.findMany({
          skip: input.offset,
          take: input.limit,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            evaluableAction: true,
          },
        }),
      ]);

      return {
        count,
        rows,
      };
    }),
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.prisma.kycAttempt.findUnique({
        where: {
          id: input.id,
        },
        include: {
          address: true,
          evaluableAction: {
            include: {
              ruleExecutions: {
                where: {
                  result: true,
                },
                include: {
                  ruleSnapshot: true,
                },
              },
              session: {
                include: {
                  user: true,
                  deviceSnapshot: {
                    include: {
                      device: true,
                      ipAddress: {
                        include: {
                          location: true,
                        },
                      },
                    },
                  },
                  events: true,
                },
              },
            },
          },
        },
      });

      if (!result) return null;

      let stripeFiles;
      try {
        stripeFiles = {
          selfie: await stripe.fileLinks.create({
            file: result.selfieFile,
            expires_at: Math.floor(Date.now() / 1000) + 30,
          }),
          selfieDocument: await stripe.fileLinks.create({
            file: result.selfieDocument,
            expires_at: Math.floor(Date.now() / 1000) + 30,
          }),
          files: await Promise.all(
            result.documentFiles.map((file) =>
              stripe.fileLinks.create({
                file,
                expires_at: Math.floor(Date.now() / 1000) + 30,
              })
            )
          ),
        };
      } catch (error) {}

      return {
        ...result,
        ...stripeFiles,
      };
    }),
});

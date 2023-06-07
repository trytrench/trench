import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";

export const customersRouter = createTRPCRouter({
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.customer.findUnique({
        where: {
          id: input.id,
        },
        include: {
          paymentMethods: {
            include: {
              paymentMethod: {
                include: {
                  card: true,
                },
              },
            },
          },
          devices: true,
          ipAddresses: {
            include: {
              ipAddress: true,
            },
          },
          //   customer: true,
          //   outcome: true,
          //   session: {
          //     include: {
          //       device: true,
          //       transactions: true,
          //       ipAddress: true,
          //     },
          //   },
        },
      });
    }),
});

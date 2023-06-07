import { z } from "zod";
import { getAggregations } from "~/server/utils/aggregations";
import { createTRPCRouter, openApiProcedure } from "../trpc";
import { prisma } from "~/server/db";
import { type Prisma, RiskLevel } from "@prisma/client";
import { runRules } from "~/server/utils/rules";
import * as Sentry from "@sentry/nextjs";
import { geocodeAddress } from "~/server/lib/mapbox";

const addressSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  postalCode: z.string().optional(),
  state: z.string().optional(),
});
export type Address = z.infer<typeof addressSchema>;

const transactionSchema = z.object({
  session: z.object({
    externalId: z.string(),
  }),
  customer: z.object({
    externalId: z.string(),
    email: z.string().email(),
  }),
  paymentMethod: z.object({
    externalId: z.string(),
    billingDetails: z.object({
      name: z.string(),
      email: z.string().email(),
      address: addressSchema.optional(),
    }),
    card: z.object({
      last4: z.string(),
      bin: z.string().optional(),
      country: z.string(),
      brand: z.string(),
      funding: z.string().optional(),
      issuer: z.string().optional(),
      fingerprint: z.string(),
      expiryMonth: z.number().optional(),
      expiryYear: z.number().optional(),
      wallet: z.string().optional(),
      threeDSecureSupported: z.boolean().optional(),
      cvcCheck: z.string().optional(),
      addressLine1Check: z.string().optional(),
      postalCodeCheck: z.string().optional(),
    }),
  }),
  transaction: z.object({
    // createdAt: z.string().datetime(),
    amount: z.number(),
    currency: z.string(),
    quantity: z.number(),
    sellerId: z.string(),
    sellerName: z.string().optional(),
    walletAddress: z.string(),
    description: z.string().optional(),
  }),
});

export const apiRouter = createTRPCRouter({
  transactionAssess: openApiProcedure
    .meta({ openapi: { method: "POST", path: "/transaction" } })
    .input(transactionSchema)
    .output(
      z.object({
        success: z.boolean(),
        riskLevel: z.enum([
          RiskLevel.Normal,
          RiskLevel.Medium,
          RiskLevel.High,
          RiskLevel.VeryHigh,
        ]),
        transactionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { transaction, customer, paymentMethod, session } = input;

      let geocode;
      const { address } = paymentMethod.billingDetails;

      if (address) {
        try {
          geocode = await geocodeAddress(address);
        } catch (error) {
          Sentry.captureException(error);
        }
      }

      // Find or create customer
      const { id: customerId } = await ctx.prisma.customer.upsert({
        where: { externalId: customer.externalId },
        update: {},
        create: customer,
        select: { id: true },
      });

      const { cvcCheck, postalCodeCheck, addressLine1Check, ...card } =
        paymentMethod.card;

      // Create transaction
      const createdTransaction = await ctx.prisma.transaction.create({
        data: {
          ...transaction,
          session: { connect: { externalId: session.externalId } },
          customer: { connect: { externalId: customer.externalId } },
          paymentMethod: {
            connectOrCreate: {
              where: { externalId: paymentMethod.externalId },
              create: {
                externalId: paymentMethod.externalId,
                name: paymentMethod.billingDetails.name,
                email: paymentMethod.billingDetails.email,
                city: paymentMethod.billingDetails.address?.city,
                country: paymentMethod.billingDetails.address?.country,
                line1: paymentMethod.billingDetails.address?.line1,
                line2: paymentMethod.billingDetails.address?.line2,
                postalCode: paymentMethod.billingDetails.address?.postalCode,
                state: paymentMethod.billingDetails.address?.state,
                geocode: geocode || undefined,
                cvcCheck,
                postalCodeCheck,
                addressLine1Check,
                card: {
                  connectOrCreate: {
                    where: {
                      fingerprint: paymentMethod.card.fingerprint,
                    },
                    create: card,
                  },
                },
              },
            },
          },
        },
        include: {
          session: {
            include: {
              transactions: true,
              device: true,
              ipAddress: true,
            },
          },
          paymentMethod: {
            include: {
              card: true,
            },
          },
          customer: true,
        },
      });

      // Connect session to customer
      await ctx.prisma.customerSession.upsert({
        where: {
          sessionId_customerId: {
            sessionId: createdTransaction.sessionId,
            customerId,
          },
        },
        update: {},
        create: { sessionId: createdTransaction.sessionId, customerId },
      });

      // Generate aggregations
      const aggregations = await getAggregations(
        new Date(createdTransaction.createdAt),
        customerId,
        createdTransaction.session.ipAddressId,
        createdTransaction.session.deviceId,
        createdTransaction.paymentMethod.cardId
      );

      // Save aggregations
      await ctx.prisma.transaction.update({
        where: { id: createdTransaction.id },
        data: {
          transforms: aggregations,
        },
      });

      const [rules, lists] = await ctx.prisma.$transaction([
        ctx.prisma.rule.findMany(),
        ctx.prisma.list.findMany({
          include: {
            items: true,
          },
        }),
      ]);
      const listsObj = lists.reduce((acc, list) => {
        acc[list.alias] = list.items.map((item) => item.value);
        return acc;
      }, {} as Record<string, string[]>);

      const { ruleExecutionResults, highestRiskLevel } = runRules({
        rules,
        payload: {
          transaction: createdTransaction,
          aggregations: aggregations,
          lists: listsObj,
        },
      });

      await ctx.prisma.$transaction([
        ctx.prisma.ruleExecution.createMany({
          data: rules
            .map((rule, index) => {
              const result = ruleExecutionResults[index];
              if (!result) {
                return null;
              }
              return {
                result: result?.result,
                error: result?.error,
                riskLevel: result.riskLevel,
                transactionId: createdTransaction.id,
                ruleId: rule.id,
              };
            })
            .filter(
              (rule) => rule !== null
            ) as Prisma.RuleExecutionCreateManyInput[],
        }),
        ctx.prisma.transaction.update({
          where: { id: createdTransaction.id },
          data: {
            riskLevel: highestRiskLevel,
          },
        }),
      ]);

      return {
        success: true,
        riskLevel: highestRiskLevel,
        transactionId: createdTransaction.id,
      };
    }),
  updateTransactionOutcome: openApiProcedure
    .meta({ openapi: { method: "POST", path: "/transaction/outcome" } })
    .input(
      z.object({
        transactionId: z.string(),
        status: z.enum(["succeeded", "failed"]),
        networkStatus: z
          .enum([
            "approved_by_network",
            "declined_by_network",
            "not_sent_to_network",
            "reversed_after_approval",
          ])
          .optional(),
        reason: z.string().optional(),
        riskLevel: z.enum(["normal", "elevated", "highest"]).optional(),
        riskScore: z.number().optional(),
        sellerMessage: z.string().optional(),
        type: z
          .enum([
            "authorized",
            "manual_review",
            "issuer_declined",
            "blocked",
            "invalid",
          ])
          .optional(),
        threeDSecureFlow: z.string().optional(),
        threeDSecureResult: z.string().optional(),
        threeDSecureResultReason: z.string().optional(),
        threeDSecureVersion: z.string().optional(),
      })
    )
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ input }) => {
      Sentry.addBreadcrumb({
        data: input,
      });
      await prisma.transactionOutcome.upsert({
        where: { transactionId: input.transactionId },
        create: input,
        update: {},
      });

      return { success: true };
    }),
});

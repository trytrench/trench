import { type Prisma } from "@prisma/client";
import Stripe from "stripe";
import superjson from "superjson";
import { z } from "zod";
import { env } from "~/env.mjs";
import { createTRPCRouter, openApiProcedure } from "../../trpc";
import { RiskLevel, UserFlow } from "~/common/types";
import { runRules } from "~/server/utils/rules";
import { paymentTransforms } from "~/server/transforms/paymentTransforms";

const schema = z.object({
  paymentIntentId: z.string(),
  paymentMethodId: z.string(),
  sessionId: z.string(),
  metadata: z.record(z.any()).optional(),
});

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export const apiPaymentsRouter = createTRPCRouter({
  paymentAssess: openApiProcedure
    .meta({ openapi: { method: "POST", path: "/payment/assess" } })
    .input(schema)
    .output(
      z.object({
        success: z.boolean(),
        riskLevel: z.nativeEnum(RiskLevel),
        paymentAttemptId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [paymentMethod, paymentIntent] = await Promise.all([
        stripe.paymentMethods.retrieve(
          input.paymentMethodId,
          {
            expand: ["customer"],
          },
          { maxNetworkRetries: 2 }
        ),
        stripe.paymentIntents.retrieve(
          input.paymentIntentId,
          {
            expand: ["customer"],
          },
          { maxNetworkRetries: 2 }
        ),
      ]);

      const customer = paymentIntent.customer || paymentMethod.customer;

      if (!paymentMethod.card)
        throw new Error("No card found on payment method");

      const session = await ctx.prisma.session.update({
        where: { customId: input.sessionId },
        data: {
          user:
            customer &&
            typeof customer !== "string" &&
            !customer.deleted &&
            customer.email
              ? {
                  connectOrCreate: {
                    where: {
                      email: customer.email,
                    },
                    create: {
                      email: customer.email,
                      name: customer.name,
                      phone: customer.phone,
                      metadata: customer.metadata,
                    },
                  },
                }
              : undefined,
          // paymentAttempts: {},
        },
        include: {
          deviceSnapshot: {
            include: {
              ipAddress: {
                include: {
                  location: true,
                },
              },
            },
          },
        },
      });

      if (!paymentMethod.card.fingerprint) {
        throw new Error("No fingerprint found on payment method");
      }

      // TODO: Move create to webhook?
      const evaluableAction = await ctx.prisma.evaluableAction.create({
        include: {
          paymentAttempt: {
            include: {
              paymentMethod: {
                include: {
                  card: true,
                  address: {
                    include: { location: true },
                  },
                },
              },
            },
          },
          session: {
            include: {
              user: true,
              deviceSnapshot: {
                include: {
                  ipAddress: {
                    include: { location: true },
                  },
                  device: true,
                },
              },
            },
          },
        },
        data: {
          session: { connect: { id: session.id } },
          paymentAttempt: {
            create: {
              amount: paymentIntent.amount,
              currency: paymentIntent.currency,
              description: paymentIntent.description,
              metadata: input.metadata || paymentIntent.metadata,
              shippingName: paymentIntent.shipping?.name,
              shippingPhone: paymentIntent.shipping?.phone,
              paymentIntentId: paymentIntent.id,
              paymentMethod: {
                connectOrCreate: {
                  where: { customId: paymentMethod.id },
                  create: {
                    customId: paymentMethod.id,
                    name: paymentMethod.billing_details.name,
                    email: paymentMethod.billing_details.email,
                    address: {
                      create: {
                        city: paymentMethod.billing_details.address?.city,
                        country: paymentMethod.billing_details.address?.country,
                        line1: paymentMethod.billing_details.address?.line1,
                        line2: paymentMethod.billing_details.address?.line2,
                        postalCode:
                          paymentMethod.billing_details.address?.postal_code,
                        state: paymentMethod.billing_details.address?.state,
                      },
                    },
                    cvcCheck: paymentMethod.card?.checks?.cvc_check,
                    postalCodeCheck:
                      paymentMethod.card?.checks?.address_postal_code_check,
                    addressLine1Check:
                      paymentMethod.card?.checks?.address_line1_check,
                    cardWallet: paymentMethod.card?.wallet?.type,
                    card: {
                      connectOrCreate: {
                        where: {
                          fingerprint: paymentMethod.card.fingerprint,
                        },
                        create: {
                          fingerprint: paymentMethod.card.fingerprint,
                          bin: paymentMethod.card.iin,
                          brand: paymentMethod.card.brand,
                          country: paymentMethod.card.country,
                          last4: paymentMethod.card.last4,
                          funding: paymentMethod.card.funding,
                          issuer: paymentMethod.card.issuer,
                          expiryMonth: paymentMethod.card.exp_month,
                          expiryYear: paymentMethod.card.exp_year,
                          threeDSecureSupported:
                            paymentMethod.card.three_d_secure_usage?.supported,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!evaluableAction.paymentAttempt)
        throw new Error("No payment attempt");

      if (paymentIntent.shipping) {
        await ctx.prisma.address.create({
          data: {
            paymentAttempt: { connect: { id: evaluableAction.id } },
            city: paymentIntent.shipping?.address?.city,
            country: paymentIntent.shipping?.address?.country,
            line1: paymentIntent.shipping?.address?.line1,
            line2: paymentIntent.shipping?.address?.line2,
            postalCode: paymentIntent.shipping?.address?.postal_code,
            state: paymentIntent.shipping?.address?.state,
          },
        });
      }

      const [rules, lists] = await ctx.prisma.$transaction([
        ctx.prisma.rule.findMany({
          where: {
            userFlows: {
              some: {
                userFlow: {
                  name: UserFlow.StripePayment,
                },
              },
            },
          },
          include: {
            currentRuleSnapshot: true,
          },
        }),
        ctx.prisma.list.findMany({
          include: {
            items: true,
          },
        }),
      ]);
      const blockLists = lists.reduce((acc, list) => {
        acc[list.alias] = list.items.map((item) => item.value);
        return acc;
      }, {} as Record<string, string[]>);

      const ruleInput = await paymentTransforms.run({
        evaluableAction,
        blockLists,
      });

      const { ruleExecutionResults, highestRiskLevel } = runRules({
        rules: rules.map((rule) => rule.currentRuleSnapshot),
        input: ruleInput,
      });

      const ipData = ruleInput.transforms.ipData;
      const ipLocationUpdate: Prisma.LocationCreateArgs["data"] = {
        latitude: ipData?.latitude,
        longitude: ipData?.longitude,
        countryISOCode: ipData?.countryISOCode,
        countryName: ipData?.countryName,
        postalCode: ipData?.postalCode,
      };

      const paymentMethodLocationUpdate: Prisma.LocationCreateArgs["data"] = {
        latitude: ruleInput.transforms.paymentMethodLocation?.latitude,
        longitude: ruleInput.transforms.paymentMethodLocation?.longitude,
        countryISOCode: ruleInput.transforms.paymentMethodLocation?.countryCode,
      };

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
                evaluableActionId: evaluableAction.id,
                ruleSnapshotId: rule.currentRuleSnapshot.id,
              };
            })
            .filter(
              (rule) => rule !== null
            ) as Prisma.RuleExecutionCreateManyInput[],
        }),
        ctx.prisma.evaluableAction.update({
          where: { id: evaluableAction.id },
          data: {
            riskLevel: highestRiskLevel,
            transformsOutput: superjson.parse(
              superjson.stringify(ruleInput.transforms)
            ),
          },
        }),
        ctx.prisma.evaluableAction.update({
          where: { id: evaluableAction.id },
          data: {
            session: {
              update: {
                deviceSnapshot: {
                  update: {
                    ipAddress: {
                      update: ipData
                        ? {
                            metadata: ipData,
                            location: {
                              upsert: {
                                update: ipLocationUpdate,
                                create: ipLocationUpdate,
                              },
                            },
                          }
                        : undefined,
                    },
                  },
                },
              },
            },
            paymentAttempt: {
              update: {
                paymentMethod: {
                  update: {
                    address: {
                      update: {
                        location: {
                          upsert: ruleInput.transforms.paymentMethodLocation
                            ? {
                                update: paymentMethodLocationUpdate,
                                create: paymentMethodLocationUpdate,
                              }
                            : undefined,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        success: true,
        riskLevel: highestRiskLevel,
        paymentAttemptId: evaluableAction.paymentAttempt.id,
      };
    }),
});

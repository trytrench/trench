import superjson from "superjson";
import Stripe from "stripe";
import { z } from "zod";
import { env } from "~/env.mjs";
import { RiskLevel } from "../../../common/types";
import { createTRPCRouter, openApiProcedure } from "../trpc";
import { ruleInputNode } from "../../transforms/ruleInput";
import { runRules } from "../../utils/rules";
import { type Prisma } from "@prisma/client";

const addressSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  line1: z.string().optional(),
  line2: z.string().optional(),
  postalCode: z.string().optional(),
  state: z.string().optional(),
});
export type Address = z.infer<typeof addressSchema>;

const schema = z.object({
  paymentIntentId: z.string(),
  paymentMethodId: z.string(),
});

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

export const apiRouter = createTRPCRouter({
  transactionAssess: openApiProcedure
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
        stripe.paymentMethods.retrieve(input.paymentMethodId, {
          expand: ["customer"],
        }),
        stripe.paymentIntents.retrieve(input.paymentIntentId, {
          expand: ["customer"],
        }),
      ]);

      const customer = paymentIntent.customer || paymentMethod.customer;

      if (!paymentMethod.card)
        throw new Error("No card found on payment method");

      const checkoutSession = await ctx.prisma.checkoutSession.update({
        where: { customId: paymentIntent.id },
        data: {
          customer:
            customer && typeof customer !== "string" && !customer.deleted
              ? {
                  connectOrCreate: {
                    where: {
                      customId: customer.id,
                    },
                    create: {
                      customId: customer.id,
                      name: customer.name,
                      phone: customer.phone,
                      email: customer.email,
                      metadata: customer.metadata,
                    },
                  },
                }
              : undefined,
          paymentAttempts: {},
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

      const paymentAttempt = await ctx.prisma.paymentAttempt.create({
        include: {
          paymentMethod: {
            include: {
              card: true,
              address: true,
            },
          },
          checkoutSession: {
            include: {
              customer: true,
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
          amount: paymentIntent.amount,
          currency: paymentIntent.currency,
          description: paymentIntent.description,
          metadata: paymentIntent.metadata,
          checkoutSession: { connect: { id: checkoutSession.id } },
          shippingName: paymentIntent.shipping?.name,
          shippingPhone: paymentIntent.shipping?.phone,
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
      });

      if (paymentIntent.shipping) {
        await ctx.prisma.address.create({
          data: {
            paymentAttempts: { connect: { id: paymentAttempt.id } },
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
        ctx.prisma.rule.findMany(),
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

      const ruleInput = await ruleInputNode.run({
        paymentAttempt,
        blockLists,
      });

      // console.log(JSON.stringify(ruleInputNode.getArtifacts(), null, 2));

      const { ruleExecutionResults, highestRiskLevel } = runRules({
        rules,
        input: ruleInput,
      });

      const ipLocationUpdate: Prisma.LocationCreateArgs["data"] = {
        latitude: ruleInput.transforms.ipData.latitude,
        longitude: ruleInput.transforms.ipData.longitude,
        countryISOCode: ruleInput.transforms.ipData.countryISOCode,
        countryName: ruleInput.transforms.ipData.countryName,
        postalCode: ruleInput.transforms.ipData.postalCode,
      };

      const paymentMethodLocationUpdate: Prisma.LocationCreateArgs["data"] = {
        latitude: ruleInput.transforms.paymentMethodLocation?.latitude,
        longitude: ruleInput.transforms.paymentMethodLocation?.longitude,
        countryISOCode: ruleInput.transforms.paymentMethodLocation.countryCode,
      };

      console.log(ruleInput.transforms.ipData);

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
                paymentAttemptId: paymentAttempt.id,
                ruleId: rule.id,
              };
            })
            .filter(
              (rule) => rule !== null
            ) as Prisma.RuleExecutionCreateManyInput[],
        }),
        ctx.prisma.paymentAttemptAssessment.upsert({
          where: { id: paymentAttempt.id },
          update: {},
          create: {
            riskLevel: highestRiskLevel,
            transformsOutput: superjson.parse(
              superjson.stringify(ruleInput.transforms)
            ),
            paymentAttempt: { connect: { id: paymentAttempt.id } },
          },
        }),
        ctx.prisma.paymentAttempt.update({
          where: { id: paymentAttempt.id },
          data: {
            checkoutSession: {
              update: {
                deviceSnapshot: {
                  update: {
                    ipAddress: {
                      update: {
                        metadata: ruleInput.transforms.ipData,
                        location: ruleInput.transforms.ipData
                          ? {
                              upsert: {
                                update: ipLocationUpdate,
                                create: ipLocationUpdate,
                              },
                            }
                          : undefined,
                      },
                    },
                  },
                },
              },
            },
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
        }),
      ]);

      return {
        success: true,
        riskLevel: highestRiskLevel,
        paymentAttemptId: paymentAttempt.id,
      };
    }),
});

import { KycAttemptStatus, type Prisma } from "@prisma/client";
import type Stripe from "stripe";
import superjson from "superjson";
import { z } from "zod";
import { env } from "~/env.mjs";
import { kycTransforms } from "~/server/transforms/kycTransforms";
import { createTRPCRouter, openApiProcedure } from "../../trpc";
import { RiskLevel, UserFlow } from "~/common/types";
import { runRules } from "~/server/utils/rules";
import { prisma } from "~/server/db";
import { stripe } from "../../../lib/stripe";

const kycSchema = z.object({
  verificationSessionId: z.string(),
  metadata: z.record(z.any()).optional(),
});

const createEvaluableAction = async (
  verificationSession: Stripe.Identity.VerificationSession,
  metadata?: Record<string, any>
) => {
  if (typeof verificationSession.last_verification_report !== "string")
    throw new Error("No verification report found");

  const verificationReport = await stripe.identity.verificationReports.retrieve(
    verificationSession.last_verification_report,
    { expand: ["document.dob", "document.expiration_date"] }
  );

  if (!verificationReport.document || !verificationReport.selfie)
    throw new Error("No document or selfie found");

  return prisma.evaluableAction.create({
    include: {
      kycAttempt: {
        include: {
          address: {
            include: {
              location: true,
            },
          },
        },
      },
      // TODO: Remove
      // We include this to fix types
      paymentAttempt: {
        include: {
          paymentMethod: {
            include: {
              card: true,
              address: true,
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
      session: {
        connectOrCreate: {
          where: { customId: verificationSession.id },
          create: {
            customId: verificationSession.id,
            userFlow: {
              connectOrCreate: {
                where: { name: UserFlow.SellerKyc },
                create: { name: UserFlow.SellerKyc },
              },
            },
          },
        },
      },
      kycAttempt: {
        create: {
          metadata,
          status:
            verificationSession.status === "verified"
              ? KycAttemptStatus.SUCCEEDED
              : verificationSession.status === "requires_input" &&
                verificationSession.last_error
              ? KycAttemptStatus.FAILED
              : KycAttemptStatus.PENDING,
          verificationReportId: verificationReport.id,
          firstName: verificationReport.document.first_name,
          lastName: verificationReport.document.last_name,
          documentErrorReason: verificationReport.document.error?.reason,
          documentErrorCode: verificationReport.document.error?.code,
          dobDay: verificationReport.document.dob?.day,
          dobMonth: verificationReport.document.dob?.month,
          dobYear: verificationReport.document.dob?.year,
          expiryDay: verificationReport.document.expiration_date?.day,
          expiryMonth: verificationReport.document.expiration_date?.month,
          expiryYear: verificationReport.document.expiration_date?.year,
          issuedDay: verificationReport.document.issued_date?.day,
          issuedMonth: verificationReport.document.issued_date?.month,
          issuedYear: verificationReport.document.issued_date?.year,
          documentStatus: verificationReport.document.status,
          documentType: verificationReport.document.type,
          issuingCountry: verificationReport.document.issuing_country,
          address: {
            create: {
              city: verificationReport.document.address?.city,
              country: verificationReport.document.address?.country,
              line1: verificationReport.document.address?.line1,
              line2: verificationReport.document.address?.line2,
              postalCode: verificationReport.document.address?.postal_code,
              state: verificationReport.document.address?.state,
            },
          },
          selfieDocument: verificationReport.selfie.document,
          selfieErrorReason: verificationReport.selfie.error?.reason,
          selfieErrorCode: verificationReport.selfie.error?.code,
          selfieFile: verificationReport.selfie.selfie,
          selfieStatus: verificationReport.selfie.status,
        },
      },
    },
  });
};

export const apiKycRouter = createTRPCRouter({
  kycAssess: openApiProcedure
    .meta({ openapi: { method: "POST", path: "/kyc/assess" } })
    .input(kycSchema)
    .output(
      z.object({
        status: z.enum(["verified", "error", "pending", "processing"]),
        riskLevel: z.nativeEnum(RiskLevel).optional(),
        error: z
          .object({
            code: z.string().nullable(),
            reason: z.string().nullable(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const verificationSession =
        await stripe.identity.verificationSessions.retrieve(
          input.verificationSessionId
        );

      if (verificationSession.status === "verified") {
        const evaluableAction = await createEvaluableAction(
          verificationSession,
          input.metadata
        );

        const [rules, lists] = await ctx.prisma.$transaction([
          ctx.prisma.rule.findMany({
            where: {
              userFlows: {
                some: {
                  userFlow: {
                    name: UserFlow.SellerKyc,
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

        const ruleInput = await kycTransforms.run({
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
          cityGeonameId: ipData?.cityGeonameId,
          cityName: ipData?.cityName,
          countryISOCode: ipData?.countryISOCode,
          countryName: ipData?.countryName,
          postalCode: ipData?.postalCode,
          regionISOCode: ipData?.subdivisionISOCode,
          regionName: ipData?.subdivisionName,
        };

        const kycLocationUpdate: Prisma.LocationCreateArgs["data"] = {
          latitude: ruleInput.transforms.kycLocation.latitude,
          longitude: ruleInput.transforms.kycLocation.longitude,
          countryISOCode: ruleInput.transforms.kycLocation.countryCode,
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
              ...(evaluableAction.session.deviceSnapshot && {
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
              }),
              kycAttempt: {
                update: {
                  address: {
                    update: {
                      location: {
                        upsert: ruleInput.transforms.kycLocation
                          ? {
                              update: kycLocationUpdate,
                              create: kycLocationUpdate,
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

        // return verified
        return { status: "verified", riskLevel: highestRiskLevel };
      } else if (verificationSession.status === "processing") {
        // return processing
        return { status: "processing" };
      } else if (
        verificationSession.status === "requires_input" &&
        verificationSession.last_error
      ) {
        if (verificationSession.last_verification_report) {
          const evaluableAction = await createEvaluableAction(
            verificationSession,
            input.metadata
          );
          await ctx.prisma.evaluableAction.update({
            where: { id: evaluableAction.id },
            data: {
              riskLevel: RiskLevel.High,
            },
          });
        }

        // return error
        return {
          status: "error",
          error: {
            reason: verificationSession.last_error.reason,
            code: verificationSession.last_error.code,
          },
        };
      } else if (verificationSession.status === "requires_input") {
        // return pending
        return { status: "pending" };
      } else {
        throw new Error("Unknown verification session status");
      }
    }),
});

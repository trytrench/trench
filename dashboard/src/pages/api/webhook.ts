import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { env } from "~/env.mjs";
import type { Readable } from "node:stream";
import { prisma } from "~/server/db";
import { PaymentOutcomeStatus } from "@prisma/client";
import { create } from "node:domain";
import { SessionType } from "../../common/types";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

const stripeStatusToPaymentOutcomeStatus = {
  succeeded: PaymentOutcomeStatus.SUCCEEDED,
  pending: PaymentOutcomeStatus.PENDING,
  failed: PaymentOutcomeStatus.FAILED,
};

// Stripe requires the raw body to construct the event.
export const config = { api: { bodyParser: false } };

const buffer = async (readable: Readable) => {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
    return;
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      (await buffer(req)).toString(),
      req.headers["stripe-signature"] as string,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    // On error, log and return the error message.
    if (err instanceof Error) console.log(err);
    console.log(`❌ Error message: ${errorMessage}`);
    res.status(400).send(`Webhook Error: ${errorMessage}`);
    return;
  }

  switch (event.type) {
    case "payment_intent.created":
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      await prisma.session.upsert({
        where: { customId: paymentIntent.id },
        update: {},
        create: {
          customId: paymentIntent.id,
          type: {
            connectOrCreate: {
              where: {
                name: SessionType.StripePayment,
              },
              create: {
                name: SessionType.StripePayment,
              },
            },
          },
        },
      });
      break;
    case "payment_intent.succeeded":
      break;
    case "payment_intent.payment_failed":
      break;
    case "charge.succeeded":
    case "charge.failed":
      const charge = event.data.object as Stripe.Charge;
      if (!charge.metadata.paymentAttemptId) {
        const [paymentMethod, paymentIntent] = await Promise.all([
          stripe.paymentMethods.retrieve(charge.payment_method as string, {
            expand: ["customer"],
          }),
          stripe.paymentIntents.retrieve(charge.payment_intent as string, {
            expand: ["customer"],
          }),
        ]);

        if (!paymentMethod.card)
          throw new Error("No card found on payment method");

        const evaluableAction = await prisma.evaluableAction.create({
          include: {
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
                    ipAddress: true,
                    device: true,
                  },
                },
              },
            },
          },
          data: {
            session: { connect: { customId: paymentIntent.id } },

            paymentAttempt: {
              create: {
                amount: paymentIntent.amount,
                currency: paymentIntent.currency,
                description: paymentIntent.description,
                metadata: paymentIntent.metadata,
                shippingName: paymentIntent.shipping?.name,
                shippingPhone: paymentIntent.shipping?.phone,
                outcome: {
                  create: {
                    status: stripeStatusToPaymentOutcomeStatus[charge.status],
                    stripeOutcome: {
                      create: {
                        networkStatus: charge.outcome?.network_status,
                        reason: charge.outcome?.reason,
                        riskLevel: charge.outcome?.risk_level,
                        riskScore: charge.outcome?.risk_score,
                        rule: charge.outcome?.rule as object,
                        sellerMessage: charge.outcome?.seller_message,
                        type: charge.outcome?.type,
                      },
                    },
                    threeDSecureFlow:
                      charge.payment_method_details?.card?.three_d_secure
                        ?.authentication_flow,
                    threeDSecureResult:
                      charge.payment_method_details?.card?.three_d_secure
                        ?.result,
                    threeDSecureResultReason:
                      charge.payment_method_details?.card?.three_d_secure
                        ?.result_reason,
                    threeDSecureVersion:
                      charge.payment_method_details?.card?.three_d_secure
                        ?.version,
                  },
                },
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
                          country:
                            paymentMethod.billing_details.address?.country,
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
                            fingerprint: paymentMethod.card.fingerprint!,
                          },
                          create: {
                            fingerprint: paymentMethod.card.fingerprint!,
                            bin: paymentMethod.card.iin,
                            brand: paymentMethod.card.brand,
                            country: paymentMethod.card.country,
                            last4: paymentMethod.card.last4,
                            funding: paymentMethod.card.funding,
                            issuer: paymentMethod.card.issuer,
                            expiryMonth: paymentMethod.card.exp_month,
                            expiryYear: paymentMethod.card.exp_year,
                            threeDSecureSupported:
                              paymentMethod.card.three_d_secure_usage
                                ?.supported,
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

        if (paymentIntent.shipping) {
          await prisma.address.create({
            data: {
              paymentAttempts: { connect: { id: evaluableAction.id } },
              city: paymentIntent.shipping?.address?.city,
              country: paymentIntent.shipping?.address?.country,
              line1: paymentIntent.shipping?.address?.line1,
              line2: paymentIntent.shipping?.address?.line2,
              postalCode: paymentIntent.shipping?.address?.postal_code,
              state: paymentIntent.shipping?.address?.state,
            },
          });
        }

        res.json({ received: true });
        return;
      }

      await prisma.paymentOutcome.create({
        data: {
          paymentAttempt: { connect: { id: charge.metadata.paymentAttemptId } },
          status: stripeStatusToPaymentOutcomeStatus[charge.status],
          stripeOutcome: {
            create: {
              networkStatus: charge.outcome?.network_status,
              reason: charge.outcome?.reason,
              riskLevel: charge.outcome?.risk_level,
              riskScore: charge.outcome?.risk_score,
              rule: charge.outcome?.rule as object,
              sellerMessage: charge.outcome?.seller_message,
              type: charge.outcome?.type,
            },
          },
          threeDSecureFlow:
            charge.payment_method_details?.card?.three_d_secure
              ?.authentication_flow,
          threeDSecureResult:
            charge.payment_method_details?.card?.three_d_secure?.result,
          threeDSecureResultReason:
            charge.payment_method_details?.card?.three_d_secure?.result_reason,
          threeDSecureVersion:
            charge.payment_method_details?.card?.three_d_secure?.version,
        },
      });

      console.log(`💵 Charge id: ${charge.id}`);
      break;
    default:
      console.warn(`🤷‍♀️ Unhandled event type: ${event.type}`);
      break;
  }

  // Return a response to acknowledge receipt of the event.
  res.json({ received: true });
}

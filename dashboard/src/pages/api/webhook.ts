import { PaymentOutcomeStatus } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Readable } from "node:stream";
import Stripe from "stripe";
import { env } from "~/env.mjs";
import { prisma } from "~/server/db";
import { UserFlow } from "../../common/types";
import { PaymentOutcomeStatus } from "@prisma/client";

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
    case "review.opened":
    case "review.closed": {
      const review = event.data.object as Stripe.Review;

      if (typeof review.charge === "string") {
        throw new Error("webhook payload has charge as string");
      }

      const chargeId = review.charge?.id;

      const outcome = await prisma.paymentOutcome.findFirst({
        include: {
          paymentAttempt: {
            include: {
              evaluableAction: true,
            },
          },
        },
        where: {
          chargeId: chargeId,
        },
      });

      if (!outcome) {
        throw new Error("No outcome found for charge");
      }

      await prisma.session.update({
        where: {
          id: outcome.paymentAttempt.evaluableAction.sessionId,
        },
        data: {
          stripeReview: {
            create: {
              open: review.open,
              reason: review.reason,
              openedReason: review.opened_reason,
              closedReason: review.closed_reason,
            },
          },
        },
      });
      break;
    }
    case "charge.succeeded":
    case "charge.failed": {
      const charge = event.data.object as Stripe.Charge;

      if (typeof charge.payment_intent !== "string")
        throw new Error("No payment intent id");

      await prisma.paymentOutcome.create({
        data: {
          chargeId: charge.id,
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
    }

    default:
      console.warn(`🤷‍♀️ Unhandled event type: ${event.type}`);
      break;
  }

  // Return a response to acknowledge receipt of the event.
  res.json({ received: true });
}

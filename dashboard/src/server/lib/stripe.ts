import Stripe from "stripe";
import { env } from "../../env.mjs";

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
  host: env.STRIPE_HOST,
  port: env.STRIPE_PORT,
  protocol: env.STRIPE_PROTOCOL,
});

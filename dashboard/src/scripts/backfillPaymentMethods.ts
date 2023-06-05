import { geocodeAddress } from "./src/server/lib/mapbox";
import { prisma } from "./src/server/db";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-11-15",
});

const main = async () => {
  const paymentMethods = await prisma.paymentMethod.findMany({
    orderBy: {
      createdAt: "desc",
    },
    include: {
      customers: {
        include: {
          customer: true,
        },
      },
    },
  });
  console.log(paymentMethods.length);

  for (const paymentMethod of paymentMethods) {
    try {
      const email = paymentMethod.customers[0]?.customer.email.toLowerCase();
      if (!email) {
        console.log("no email", paymentMethod.id);
        continue;
      }
      const query = `email:"${email}"`;
      const result = await stripe.customers.search({
        query,
      });

      if (!result.data.length) {
        console.log("no customer", paymentMethod.id);
        continue;
      }

      let stripePaymentMethod;
      for (const customer of result.data) {
        try {
          stripePaymentMethod = await stripe.customers.retrievePaymentMethod(
            customer.id,
            paymentMethod.externalId
          );
        } catch (error) {}
      }

      if (!stripePaymentMethod?.card) {
        console.log("no payment method", paymentMethod.id);
        continue;
      }

      const geocode = await geocodeAddress({
        line1: stripePaymentMethod.billing_details?.address?.line1 || undefined,
        line2: stripePaymentMethod.billing_details?.address?.line2 || undefined,
        city: stripePaymentMethod.billing_details?.address?.city || undefined,
        state: stripePaymentMethod.billing_details?.address?.state || undefined,
        country:
          stripePaymentMethod.billing_details?.address?.country || undefined,
        postalCode:
          stripePaymentMethod.billing_details?.address?.postal_code ||
          undefined,
      });

      await prisma.paymentMethod.update({
        where: {
          id: paymentMethod.id,
        },
        data: {
          // card: {
          //   update: {
          //     expiryMonth: stripePaymentMethod.card.exp_month,
          //     expiryYear: stripePaymentMethod.card.exp_year,
          //   },
          // },
          line1:
            stripePaymentMethod.billing_details?.address?.line1 || undefined,
          line2:
            stripePaymentMethod.billing_details?.address?.line2 || undefined,
          city: stripePaymentMethod.billing_details?.address?.city || undefined,
          state:
            stripePaymentMethod.billing_details?.address?.state || undefined,
          country:
            stripePaymentMethod.billing_details?.address?.country || undefined,
          postalCode:
            stripePaymentMethod.billing_details?.address?.postal_code ||
            undefined,
          geocode: geocode || undefined,
          cvcCheck: stripePaymentMethod.card.checks?.cvc_check,
          addressLine1Check:
            stripePaymentMethod.card.checks?.address_line1_check,
          postalCodeCheck:
            stripePaymentMethod.card?.checks?.address_postal_code_check,
        },
      });
      console.log("updated", paymentMethod.id);
    } catch (e) {
      console.error(e);
    }
  }
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

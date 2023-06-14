---
title: Stripe Integration
sidebar_position: 2
---

## Data collection (5 min)

Learn how to easily integrate Trench for data collection in payment flows that follow the [Stripe Quickstart guide](https://stripe.com/docs/payments/quickstart). If you also want to assess payments with Trench, follow the [Assess Payments](#assess-payments) guide.

### Sync Stripe data

Create a [Stripe webhook](https://dashboard.stripe.com/webhooks) endpoint with the URL `{{TRENCH_URL}}/api/webhook`. Select the `Charge`, `Radar`, and `Payment Intent` events to listen to.

### Initialize Trench

When you create a new payment intent, pass the client secret to Trench to initialize a session.

```jsx title="App.jsx"
export default function App() {
  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    fetch("/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: "xl-tshirt" }] }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, []);

  useEffect(() => {
    // Initialize Trench
    if (clientSecret) initialize(process.env.TRENCH_API_URL, clientSecret);
  }, [clientSecret]);
```

## Assess payments

Learn how to integrate Trench to assess payments. This requires modifying your payment flow to [finalize payments on the server](https://stripe.com/docs/payments/finalize-payments-on-the-server).

### Sync Stripe data

Create a [Stripe webhook](https://dashboard.stripe.com/webhooks) endpoint with the URL `{{TRENCH_URL}}/api/webhook`. Select the `Charge`, `Radar`, and `Payment Intent` events to listen to.

### Create a PaymentIntent

Add an endpoint on your server that creates a PaymentIntent. A PaymentIntent tracks the customer’s payment lifecycle, keeping track of any failed payment attempts and ensuring the customer is only charged once. Return the PaymentIntent’s client secret in the response to finish the payment on the client.

```js title="server.js" {4-12}
const stripe = require("stripe")("sk_test_4eC39HqLyjWDarjtT1zdp7dc");

app.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;

  // Create a PaymentIntent with the order amount and currency
  const paymentIntent = await stripe.paymentIntents.create({
    amount: calculateOrderAmount(items),
    currency: "usd",
    automatic_payment_methods: {
      enabled: true,
    },
  });

  res.send({ clientSecret: paymentIntent.client_secret });
});
```

### Add and configure the Elements provider to your checkout page

Immediately make a request to the endpoint on your server to create a new PaymentIntent as soon as your checkout page loads. Pass the client secret as an option to the Elements provider.

```jsx title="App.jsx" {6-11,17-18,24-29}
const stripePromise = loadStripe("pk_test_TYooMQauvdEDq54NiTphI7jx");

export default function App() {
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    // Create PaymentIntent as soon as the page loads
    fetch("/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ id: "xl-tshirt" }] }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, []);

  useEffect(() => {
    // Initialize Trench
    if (clientSecret) initialize(process.env.TRENCH_API_URL, clientSecret);
  }, [clientSecret]);

  return (
    <div className="App">
      {clientSecret && (
        <Elements
          options={{ clientSecret, paymentMethodCreation: "manual" }}
          stripe={stripePromise}
        >
          <CheckoutForm />
        </Elements>
      )}
    </div>
  );
}
```

### Add the Payment Element component

Use the PaymentElement component to build your form. When the customer submits your payment form, create a PaymentMethod to send to your server for additional validation or business logic prior to confirmation.

```jsx title="CheckoutForm.jsx" {13-14, 20-23, 32-40, 50}
export default function CheckoutForm({ clientSecret }) {
  const stripe = useStripe();
  const elements = useElements();

  const [errorMessage, setErrorMessage] = useState();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!stripe) return;

    setLoading(true);

    // Trigger form validation and wallet collection
    const { error: submitError } = await elements.submit();
    if (submitError) {
      handleError(submitError);
      return;
    }

    // Create the PaymentMethod using the details collected by the Payment Element
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      elements,
    });

    if (error) {
      // This point is only reached if there's an immediate error when
      // creating the PaymentMethod. Show the error to your customer (for example, payment details incomplete)
      handleError(error);
      return;
    }

    // Create the PaymentIntent
    const res = await fetch("/confirm-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentIntentId: clientSecret.split("_secret")[0],
        paymentMethodId: paymentMethod.id,
      }),
    });

    const data = await res.json();

    // Handle any next actions or errors. See the Handle any next actions step for implementation.
    handleServerResponse(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      <button type="submit" disabled={!stripe || loading}>
        Submit
      </button>
      {errorMessage && <div>{errorMessage}</div>}
    </form>
  );
}
```

### Submit the payment to Stripe

On the server, send the `paymentIntentId` and `payentMethodId` to Trench to assess the payment. Attach the Trench `paymentAttemptId` to the `PaymentIntent`. If the risk level is normal, confirm the payment intent.

```js title="server.js"
app.post("/confirm-payment-intent", async (req, res) => {
  // Assess payment
  const response = await fetch(`${process.env.TRENCH_API_URL}/payment/assess`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.TRENCH_API_KEY,
    },
    body: JSON.stringify({ paymentIntentId, paymentMethodId }),
  });

  const data: { riskLevel: string, paymentAttemptId: string } =
    await response.json();

  // Attach the paymentAttemptId to the payment intent
  await stripe.paymentIntents.update(paymentIntentId, {
    metadata: { paymentAttemptId: data.paymentAttemptId },
  });

  if (data.riskLevel === "High") {
    res.json({ statusCode: 400, message: "Your card was declined" });
    return;
  }

  const intent = await stripe.paymentIntents.confirmPaymentIntent({
    payment_method: req.body.paymentMethodId,
    return_url: "http://localhost:3000",
    use_stripe_sdk: true,
    mandate_data: {
      customer_acceptance: {
        type: "online",
        online: {
          ip_address: req.ip,
          user_agent: req.get("user-agent"),
        },
      },
    },
  });

  res.json({ status: intent.status });
});
```

### Handle any next actions

When the PaymentIntent requires additional action from the customer, such as authenticating with 3D Secure or redirecting to a different site, you need to trigger those actions.

Use `stripe.handleNextAction` to trigger the UI for handling customer action and completing the payment.

```jsx title="CheckoutForm.jsx"
const handleServerResponse = async (response) => {
  if (response.error) {
    // Show error from server on payment form
  } else if (response.status === "requires_action") {
    // Use Stripe.js to handle the required next action
    const { error, paymentIntent } = await stripe.handleNextAction({
      clientSecret: response.clientSecret,
    });

    if (error) {
      // Show error from Stripe.js in payment form
    } else {
      // Actions handled, show success message
    }
  } else {
    // No actions needed, show success message
  }
};
```

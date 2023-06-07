import { initialize } from "../src/index";

const baseUrl = "http://localhost:3000/api";

// On frontend initialize the SDK
await initialize(baseUrl, "transactionId");

// On backend send transaction data to API
const transaction = {
  customer: {
    externalId: "1234",
    email: "johndoe@example.com",
  },
  paymentMethod: {
    name: "John Does",
    externalId: "1234",
    card: {
      last4: "1234",
      bin: "456789",
      country: "US",
      brand: "Visa",
      funding: "credit",
      issuer: "Bank of Example",
      fingerprint: "e5e5b5f7h5i5j5k5",
      wallet: "exampleWallet",
      threeDSecureSupported: true,
      cvcCheck: "pass",
    },
    billingDetails: {
      name: "John Does",
      email: "johndoe@example.com",
    },
  },
  transaction: {
    amount: 10000,
    currency: "USD",
    quantity: 1,
    sellerId: "seller_67890",
    walletAddress: "0x9fB29AAc15b9A4B7F17c3385939b007540f4d791",
  },
  session: {
    externalId: "transactionId",
  },
};

await fetch(`${baseUrl}/transaction`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-api-key": "API_KEY" },
  body: new TextEncoder().encode(JSON.stringify(transaction)),
});

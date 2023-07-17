import { expect, test, vi } from "vitest";

import { appRouter } from "~/server/api/root";
import { createInnerTRPCContext } from "~/server/api/trpc";
import { mockDeviceSnapshot, mockIpAddress, mockDevice } from "./sampleData";

test("transaction insert should work", async () => {
  const CLIENT_IP = "192.160.0.0.1";
  const ctx = createInnerTRPCContext({
    apiKey: process.env.API_KEY ?? "",
    clientIp: CLIENT_IP,
    session: {
      user: {
        id: "1234",
      },
      expires: new Date().toDateString(),
    },
  });
  const caller = appRouter.createCaller(ctx);

  const EXTERNAL_SESSION_ID = "1234";

  const deviceSnapshot = mockDeviceSnapshot();
  const ipAddress = mockIpAddress();
  const device = mockDevice();

  await ctx.prisma.session.upsert({
    where: { customId: EXTERNAL_SESSION_ID },
    update: {},
    create: {
      customId: EXTERNAL_SESSION_ID,
      userFlow: {
        create: {
          name: "test",
        },
      },
      deviceSnapshot: {
        create: {
          ...deviceSnapshot,
          ipAddress: {
            create: {
              ...ipAddress,
              locationId: undefined,
              location: { create: ipAddress.location },
            },
          },
          device: {
            create: device,
          },
        },
      },
    },
  });

  const paymentIntentId = "pi_1234";
  const paymentMethodId = "pm_1234";

  const response = await caller.api.payments.paymentAssess({
    paymentIntentId: paymentIntentId,
    paymentMethodId: paymentMethodId,
    sessionId: EXTERNAL_SESSION_ID,
    metadata: {},
  });
  console.log(response);

  // expect(response.success).toMatchObject(true);
});

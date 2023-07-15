import { expect, test, vi } from "vitest";

import { appRouter } from "~/server/api/root";
import { createInnerTRPCContext } from "~/server/api/trpc";
import { mockTransaction, mockSampleDevice } from "./sampleData";

test("transaction insert should work", async () => {
  console.log(process.env);
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

  await ctx.prisma.session.upsert({
    where: { externalId: EXTERNAL_SESSION_ID },
    update: {},
    create: {
      externalId: EXTERNAL_SESSION_ID,
      device: { create: { components: mockSampleDevice() } },

      ipAddress: { create: { ipAddress: CLIENT_IP } },
    },
  });

  const response = await caller.api.transactionAssess(
    mockTransaction({
      externalSessionId: EXTERNAL_SESSION_ID,
    })
  );

  expect(response.success).toMatchObject(true);
});

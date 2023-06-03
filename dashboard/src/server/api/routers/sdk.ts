import { hashComponents, sources } from "@fingerprintjs/fingerprintjs";
import jwt from "jsonwebtoken";
import { mapValues } from "lodash";
import { z } from "zod";
import { getIpData, maxMind } from "~/server/lib/maxMind";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { env } from "~/env.mjs";
import { decode } from "~/server/lib/obfuscate";
import { userAgentFromString } from "next/server";

const componentSchema = z.object({
  value: z.any(),
  error: z.any(),
  duration: z.number(),
});

const deviceSchema = z.object({
  externalSessionId: z.string(),
  deviceToken: z.string().optional(),
  device: z.object({ ...mapValues(sources, () => componentSchema) }),
  incognitoResult: z.any(),
  fp2Data: z.any(),
});

export const sdkRouter = createTRPCRouter({
  deviceCreate: publicProcedure
    .meta({ openapi: { method: "POST", path: "/device" } })
    .input(z.object({ payload: z.string() }))
    .output(z.object({ deviceId: z.string(), deviceToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { payload } = input;

      const decodedPayload = decode(payload);
      const deviceData = deviceSchema.parse(JSON.parse(decodedPayload));

      const { externalSessionId, deviceToken, device } = deviceData;

      let existingDeviceId;
      if (deviceToken) {
        try {
          const { deviceId } = jwt.verify(deviceToken, env.JWT_SECRET) as {
            deviceId?: string;
          };
          if (deviceId) existingDeviceId = deviceId;
        } catch (error) {
          console.error(error);
        }
      }

      const ipAddress =
        env.NODE_ENV === "development" ? "99.120.79.196" : ctx.clientIp || "";

      const existingIpAddress = await ctx.prisma.ipAddress.findUnique({
        where: { ipAddress },
        select: { id: true },
      });

      let ipData;
      if (!existingIpAddress) {
        try {
          ipData = getIpData(await maxMind.insights(ipAddress));
        } catch (error) {
          console.error(error);
        }
      }

      const userAgentData = userAgentFromString(deviceData.fp2Data?.userAgent);

      const session = await ctx.prisma.checkoutSession.upsert({
        where: { customId: externalSessionId },
        update: {},
        create: {
          customId: externalSessionId,

          deviceSnapshot: {
            create: {
              fingerprint: hashComponents(device),
              userAgent: deviceData.fp2Data?.userAgent as string,
              browserName: userAgentData.browser.name,
              browserVersion: userAgentData.browser.version,
              deviceModel: userAgentData.device.model,
              deviceType: userAgentData.device.type,
              deviceVendor: userAgentData.device.vendor,
              engineName: userAgentData.engine.name,
              engineVersion: userAgentData.engine.version,
              osName: userAgentData.os.name,
              osVersion: userAgentData.os.version,
              cpuArchitecture: userAgentData.cpu.architecture,
              isIncognito: deviceData.incognitoResult?.isPrivate,
              reqUserAgent: ctx.userAgent,
              screenResolution: Array.isArray(
                deviceData.device.screenResolution.value
              )
                ? deviceData.device.screenResolution.value.join("x")
                : undefined,
              timezone:
                typeof deviceData.device.timezone.value === "string"
                  ? deviceData.device.timezone.value
                  : undefined,
              device: {
                create: true,
              },
            },
          },
        },
        select: {
          id: true,
          device: { select: { id: true } },
        },
      });

      const deviceId = session.device.id;

      await ctx.prisma.deviceSnapshot.create({
        data: {
          data: deviceData,
        },
      });

      const token = jwt.sign({ deviceId: deviceId }, env.JWT_SECRET);

      return {
        deviceId: deviceId,
        deviceToken: token,
      };
    }),
});

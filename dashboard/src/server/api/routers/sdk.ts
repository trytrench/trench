import { hashComponents, sources } from "@fingerprintjs/fingerprintjs";
import jwt from "jsonwebtoken";
import { mapValues } from "lodash";
import { z } from "zod";
import { getIpData, maxMind } from "~/server/lib/maxMind";
import { createTRPCRouter, publicProcedure } from "../trpc";
import { env } from "~/env.mjs";
import { decode } from "~/server/lib/obfuscate";

const componentSchema = z.object({
  value: z.any(),
  error: z.any(),
  duration: z.number(),
});

const deviceSchema = z.object({
  externalSessionId: z.string(),
  deviceToken: z.string().optional(),
  device: z.object({ ...mapValues(sources, () => componentSchema) }),
  lies: z.any(),
  trash: z.any(),
  capturedErrors: z.any(),
  incognitoResult: z.any(),
  fingerprint: z.any(),
  webRTCData: z.any(),
  webRTCDevices: z.any(),
  status: z.any(),
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

      const session = await ctx.prisma.session.upsert({
        where: { externalId: externalSessionId },
        update: {},
        create: {
          externalId: externalSessionId,
          device: existingDeviceId
            ? {
                connectOrCreate: {
                  where: { id: existingDeviceId },
                  create: {
                    fingerprint: hashComponents(device),
                    components: device,
                  },
                },
              }
            : {
                create: {
                  fingerprint: hashComponents(device),
                  components: device,
                },
              },

          ipAddress: existingIpAddress
            ? { connect: { id: existingIpAddress.id } }
            : { create: { ipAddress, ...ipData } },
        },
        select: {
          id: true,
          device: { select: { id: true } },
        },
      });

      const deviceId = session.device.id;

      await ctx.prisma.deviceData.create({
        data: {
          deviceId,
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

import type { NextApiRequest, NextApiResponse } from "next";
import { ulid } from "ulid";
import { z } from "zod";
import { env } from "~/env";
import { prisma } from "~/server/db";
import jwt from "jsonwebtoken";
import { hashComponents, sources } from "@fingerprintjs/fingerprintjs";
import { mapValues } from "lodash";
import cors from "nextjs-cors";

const componentSchema = z.object({
  value: z.any(),
  error: z.any(),
  duration: z.number(),
});

const eventSchema = z.object({
  type: z.literal("pageview"),
  data: z.object({
    sessionId: z.string(),
    deviceToken: z.string().optional(),
    fingerprintComponents: z.object({
      ...mapValues(sources, () => componentSchema),
    }),
    userAgent: z.string().optional(),
    device: z.object({
      model: z.string().optional(),
      type: z.string().optional(),
      vendor: z.string().optional(),
    }),
    os: z.object({
      name: z.string().optional(),
      version: z.string().optional(),
    }),
    browser: z.object({
      name: z.string().optional(),
      version: z.string().optional(),
    }),
    currentUrl: z.string().optional(),
    referrer: z.string().optional(),
    host: z.string().optional(),
    pathname: z.string().optional(),
    browserLanguage: z.string().optional(),
    screenHeight: z.number().optional(),
    screenWidth: z.number().optional(),
    viewportHeight: z.number().optional(),
    viewportWidth: z.number().optional(),
  }),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await cors(req, res, {
    methods: ["POST"],
    origin: "*",
  });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (req.headers["x-api-key"] !== env.CLIENT_KEY) {
    return res.status(401).json({ message: "Invalid API Key" });
  }

  const parsedResult = eventSchema.safeParse(req.body);
  if (!parsedResult.success) {
    return res.status(400).json({ error: parsedResult.error.message });
  }
  const { fingerprintComponents, deviceToken, ...eventData } =
    parsedResult.data.data;

  let existingDeviceId;
  if (deviceToken) {
    try {
      const { deviceId } = jwt.verify(deviceToken, env.JWT_SECRET) as {
        deviceId?: string;
      };
      existingDeviceId = deviceId;
    } catch (error) {
      console.error(error);
    }
  }

  const deviceId = existingDeviceId ?? ulid();

  const ipAddress = req.headers["x-forwarded-for"] as string | undefined;
  const fingerprint = hashComponents(fingerprintComponents);

  const eventId = ulid(Date.now());

  await prisma.event.create({
    data: {
      id: eventId,
      timestamp: new Date().toISOString(),
      type: parsedResult.data.type,
      data: {
        deviceId,
        ipAddress,
        fingerprint,
        ...eventData,
      },
    },
  });

  const token = jwt.sign({ deviceId }, env.JWT_SECRET);

  res.status(200).json({ deviceToken: token });
}

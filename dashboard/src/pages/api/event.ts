import { type Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { ulid } from "ulid";
import { z } from "zod";
import { prisma } from "~/server/db";

const eventSchema = z.object({
  timestamp: z
    .string()
    .datetime()
    .optional()
    .transform((x) => (x ? new Date(x) : new Date())),
  type: z.string(),
  data: z.record(z.unknown()),
  options: z
    .object({
      sync: z.boolean().optional(),
      syncTimeoutMs: z.number().optional(),
    })
    .optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end("Method Not Allowed");
  }

  const result = eventSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }
  const event = result.data;

<<<<<<< HEAD
  const eventId = ulid(event.timestamp.getTime());
  await prisma.eventLog.create({
    data: {
      id: eventId,
=======
  await prisma.eventLog.create({
    data: {
      id: ulid(event.timestamp.getTime()),
>>>>>>> origin/micwu/shadcn-switch
      timestamp: event.timestamp,
      type: event.type,
      data: event.data as Prisma.JsonObject,
    },
<<<<<<< HEAD
  });

  if (result.data.options?.sync) {
    const syncTimeoutMs = result.data.options?.syncTimeoutMs ?? 2000;
    // Poll for the event to be processed by the consumer
    const start = Date.now();
    while (Date.now() - start < syncTimeoutMs) {
      const event = await prisma.outputLog.findFirst({
        where: {
          datasetId: 0,
          eventId,
        },
      });
      if (event) {
        res.status(200).json({
          success: true,
          event: event.data,
        });
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    res.status(200).json({
      success: false,
      error: "Timeout",
    });
  } else {
    res.status(200).json({
      success: true,
    });
  }
=======
  });

  res.status(200).json({
    success: true,
  });
>>>>>>> origin/micwu/shadcn-switch
}

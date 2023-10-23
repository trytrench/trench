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

  await prisma.eventLog.create({
    data: {
      id: ulid(event.timestamp.getTime()),
      timestamp: event.timestamp,
      type: event.type,
      data: event.data as Prisma.JsonObject,
    },
  });

  res.status(200).json({
    success: true,
  });
}

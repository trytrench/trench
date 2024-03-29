import { type Prisma } from "@prisma/client";
import {
  createEngine,
  fetchCurrentEngineId,
} from "event-processing/src/server";
import type { NextApiRequest, NextApiResponse } from "next";
import { ulid } from "ulid";
import { z } from "zod";
import { env } from "~/env";
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
    })
    .optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  if (req.headers["x-api-key"] !== env.API_KEY) {
    return res.status(401).json({ message: "Invalid API Key" });
  }

  const parsedResult = eventSchema.safeParse(req.body);

  if (!parsedResult.success) {
    return res.status(400).json({ error: parsedResult.error.message });
  }
  const event = parsedResult.data;

  const eventId = ulid(event.timestamp.getTime());

  await prisma.event.create({
    data: {
      id: eventId,
      timestamp: event.timestamp,
      type: event.type,
      data: event.data as Prisma.JsonObject,
      options: event.options,
    },
  });

  if (event.options?.sync) {
    // Get latest engine
    const engineId = await fetchCurrentEngineId();
    if (!engineId) {
      throw new Error("No engine deployed");
    }
    const engine = await createEngine({ engineId });

    engine.initState({
      id: eventId,
      type: event.type,
      data: event.data,
      timestamp: event.timestamp,
    });

    const results = await engine.getAllEngineResults();

    return res.status(200).json({
      output: {
        results,
      },
    });
  }
  res.status(200).json({
    success: true,
  });
}

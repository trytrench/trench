import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { env } from "~/env.mjs";
import { compileSqrl } from "~/lib/compileSqrl";
import { createSqrlInstance } from "~/lib/createSqrlInstance";
import { batchUpsert, runEvent } from "~/lib/sqrlExecution";
import { prisma } from "~/server/db";

const eventSchema = z.object({
  timestamp: z.string(),
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

  const instance = await createSqrlInstance({
    config: {
      "redis.address": env.SQRL_REDIS,
    },
  });

  const files = await prisma.file.findMany({
    include: {
      currentFileSnapshot: true,
    },
  });
  const fileData =
    files.reduce((acc, file) => {
      acc[file.name] = file.currentFileSnapshot.code;
      return acc;
    }, {} as Record<string, string>) || {};

  const { executable } = await compileSqrl(instance, fileData);

  const eventData = await runEvent(event, executable);
  await batchUpsert(eventData);

  res.status(200).json({
    entities: eventData.entities,
    labels: eventData.eventLabels,
    entityLabels: eventData.entityLabelsToAdd,
    events: eventData.events,
  });
}

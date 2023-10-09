import { Prisma, PrismaClient } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { ulid } from "ulid";
import { z } from "zod";
import { prisma } from "~/server/db";

type Event = {
  timestamp: Date;
  type: string;
  data: Record<string, unknown>;
};

interface EventQueueInterface {
  addEvent(event: Event): Promise<void>;
}

class PostgresEventQueue implements EventQueueInterface {
  async addEvent(event: Event): Promise<void> {
    await prisma.eventLog.create({
      data: {
        id: ulid(event.timestamp.getTime()),
        timestamp: event.timestamp,
        type: event.type,
        data: event.data as Prisma.JsonObject,
      },
    });
  }
}

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

  const queue = new PostgresEventQueue();

  await queue.addEvent(event);

  res.status(200).json({
    success: true,
  });

  // const instance = await createSqrlInstance({
  //   config: {
  //     "redis.address": env.REDIS_URL,
  //   },
  // });

  // const files = await prisma.file.findMany({
  //   include: {
  //     currentFileSnapshot: true,
  //   },
  // });
  // const fileData =
  //   files.reduce((acc, file) => {
  //     acc[file.name] = file.currentFileSnapshot.code;
  //     return acc;
  //   }, {} as Record<string, string>) || {};

  // const { executable } = await compileSqrl(instance, fileData);

  // const eventData = await runEvent(event, executable);
  // await batchUpsert(eventData);

  // res.status(200).json({
  //   entities: eventData.entities,
  //   labels: eventData.eventLabels,
  //   entityLabels: eventData.entityLabelsToAdd,
  //   events: eventData.events,
  // });
}

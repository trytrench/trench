import { type Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";
import { ulid } from "ulid";
import { bigint, z } from "zod";
import { db, prisma } from "~/server/db";
import { batchInsertEvents, getDatasetData } from "event-processing";
import { errorIfFalse } from "../../server/lib/throwIfFalse";
import { processEvents } from "sqrl-helpers";

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
    return res.status(405).end("Method Not Allowed");
  }

  const parsedResult = eventSchema.safeParse(req.body);

  if (!parsedResult.success) {
    return res.status(400).json({ error: parsedResult.error.message });
  }
  const event = parsedResult.data;

  const eventId = ulid(event.timestamp.getTime());

  await prisma.eventLog.create({
    data: {
      id: eventId,
      timestamp: event.timestamp,
      type: event.type,
      data: event.data as Prisma.JsonObject,
      options: event.options,
    },
  });

  if (event.options?.sync) {
    // Get result immediately, then add to output log.

    const project = await prisma.project.findFirst();

    errorIfFalse(!!project, "No project found");
    errorIfFalse(!!project?.productionDatasetId, "No prod dataset Id");

    const { datasetId, code } = await getDatasetData({
      datasetId: project.productionDatasetId,
      dbClient: prisma,
    });

    const result = await processEvents({
      events: [{ ...event, id: eventId }],
      files: code,
      datasetId: datasetId,
    });

    await batchInsertEvents({
      events: result,
      clickhouseClient: db,
    });

    const output = result[0]!;

    return res.status(200).json({
      output: {
        ...output,
        datasetId: Number(output.datasetId),
      },
    });
  }
  res.status(200).json({
    success: true,
  });
}

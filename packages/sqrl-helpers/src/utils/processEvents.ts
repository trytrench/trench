import { Event } from "../types";
import { compileSqrl } from "./compileSqrl";
import { createSqrlInstance } from "./createSqrlInstance";
import { EventOutput, runEvent } from "./runEvent";

export async function processEvents(props: {
  events: Event[];
  files: Record<string, string>;
  datasetId: bigint;
}): Promise<EventOutput[]> {
  const { events, files, datasetId } = props;

  const results: Awaited<ReturnType<typeof runEvent>>[] = [];
  const instance = await createSqrlInstance({
    config: {
      "redis.address": process.env.REDIS_URL,
    },
  });

  const { executable } = await compileSqrl(instance, files);

  for (const event of events) {
    results.push(await runEvent({ event, executable, datasetId }));
  }

  return results;
}

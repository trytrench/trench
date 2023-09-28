import amqp from "amqplib";
import pLimit from "p-limit";
import { AsyncQueue } from "~/lib/Queue";
import { compileSqrl } from "~/lib/compileSqrl";
import { createSqrlInstance } from "~/lib/createSqrlInstance";
import { batchUpsert, runEvent } from "~/lib/sqrlExecution";
import { prisma } from "~/server/db";

async function main() {
  const instance = await createSqrlInstance({
    config: {
      "redis.address": process.env.SQRL_REDIS_URL,
      // "state.allow-in-memory": true,
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

  // Open connection and create channel
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();

  const results: Awaited<ReturnType<typeof runEvent>>[] = [];
  const BATCH_SIZE = 100;
  const queue = new AsyncQueue();

  // Set prefetch count
  await channel.prefetch(10);

  try {
    await channel.consume(
      "githubEvents",
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      async (msg) => {
        if (!msg) return;

        const event = JSON.parse(msg.content.toString());
        try {
          const eventData = await runEvent(event, executable);
          channel.ack(msg);
          results.push(eventData);

          if (results.length >= BATCH_SIZE) {
            queue.enqueue(() =>
              batchUpsert({
                events: results.flatMap((result) => result.events),
                entities: results.flatMap((result) => result.entities),
                entityLabelsToAdd: results.flatMap(
                  (result) => result.entityLabelsToAdd
                ),
                entityLabelsToRemove: results.flatMap(
                  (result) => result.entityLabelsToRemove
                ),
                eventLabels: results.flatMap((result) => result.eventLabels),
                entityToEventLinks: results.flatMap(
                  (result) => result.entityToEventLinks
                ),
              })
            );
            results.length = 0;
          }
        } catch (err) {
          console.error("Error processing message:", err);
          channel.nack(msg);
        }
      },
      { noAck: false }
    );
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

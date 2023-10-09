import amqp from "amqplib";
import pLimit from "p-limit";
import { AsyncQueue } from "~/lib/Queue";
import { compileSqrl } from "~/lib/compileSqrl";
import { createSqrlInstance } from "~/lib/createSqrlInstance";
import { batchUpsert, runEvent } from "~/lib/sqrlExecution";
import { prisma } from "~/server/db";

const BATCH_SIZE = 100;
const TIMEOUT = 5000;

async function consumeMessages(
  channel: amqp.Channel
): Promise<amqp.ConsumeMessage[]> {
  return new Promise((resolve, reject) => {
    const messages: amqp.ConsumeMessage[] = [];

    const timeout = setTimeout(() => {
      channel.cancel("consumer").catch(reject);
      resolve(messages);
    }, TIMEOUT);

    channel
      .consume(
        "githubEvents",
        (msg) => {
          if (!msg) return;
          messages.push(msg);

          if (messages.length >= BATCH_SIZE) {
            if (timeout) clearTimeout(timeout);
            channel.cancel("consumer").catch(reject);
            resolve(messages);
          }
        },
        { consumerTag: "consumer" }
      )
      .catch(reject);
  });
}

async function main() {
  const instance = await createSqrlInstance({
    config: {
      "redis.address": process.env.REDIS_URL,
      // "state.allow-in-memory": true,
    },
  });

  const dataset = await prisma.dataset.findFirstOrThrow();
  const fileData =
    (dataset.rules as { code: string; name: string }[]).reduce(
      (acc, file) => {
        acc[file.name] = file.code;
        return acc;
      },
      {} as Record<string, string>
    ) || {};

  const { executable } = await compileSqrl(instance, fileData);

  // Open connection and create channel
  const connection = await amqp.connect("amqp://localhost");
  const channel = await connection.createChannel();
  await channel.prefetch(BATCH_SIZE);

  const limit = pLimit(5);

  while (true) {
    const messages = await consumeMessages(channel);
    const events = await Promise.all(
      messages.map((msg) =>
        limit(() => runEvent(JSON.parse(msg.content.toString()), executable))
      )
    );

    await batchUpsert(events, dataset.id);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

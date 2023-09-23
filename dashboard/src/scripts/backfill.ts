import { compileSqrl } from "~/lib/compileSqrl";
import { createSqrlInstance } from "~/lib/createSqrlInstance";
import { batchUpsert, runEvent } from "~/lib/sqrlExecution";
import { prisma } from "~/server/db";
import data from "./loadData";

class Queue {
  tasks: (() => Promise<void>)[];
  running: boolean;

  constructor() {
    this.tasks = [];
    this.running = false;
  }

  enqueue(task: () => Promise<void>) {
    this.tasks.push(task);
  }

  async process() {
    if (this.running) return;
    this.running = true;
    while (this.tasks.length > 0) {
      const task = this.tasks.shift();
      try {
        await task?.();
        // console.log("Processed task. Tasks remaining:", this.tasks.length);
      } catch (e) {
        console.error("An error occurred while processing the task:", e);
      }
    }

    this.running = false;
  }
}

const queue = new Queue();

const msgs = data;

async function main() {
  const instance = await createSqrlInstance({
    config: {
      "state.allow-in-memory": true,
    },
    // config: {
    //   "redis.address": process.env.SQRL_REDIS_URL,
    // },
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

  const BATCH_SIZE = 3000;

  for (let i = 0; i < msgs.length; i += BATCH_SIZE) {
    const batch = msgs.slice(i, i + BATCH_SIZE);
    const start = i;
    const end = Math.min(i + BATCH_SIZE, msgs.length);
    console.time(
      `Processed records ${start} to ${end} of ${msgs.length} (${Math.round(
        (end / msgs.length) * 100
      )}%)`
    );

    const results: Awaited<ReturnType<typeof runEvent>>[] = [];
    for (const msg of batch) {
      try {
        results.push(await runEvent(msg as Event, executable));
      } catch (e) {
        console.error(msg);
        console.error(e);
      }
    }
    console.timeEnd(
      `Processed records ${start} to ${end} of ${msgs.length} (${Math.round(
        (end / msgs.length) * 100
      )}%)`
    );

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
    queue.process().catch(console.error);
  }

  process.on("SIGINT", () => {
    process.exit(0);
  });
}

main().catch((error) => {
  console.log(error);
});

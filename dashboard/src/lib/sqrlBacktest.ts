import { format } from "date-fns";
import { compileSqrl } from "~/lib/compileSqrl";
import { createSqrlInstance } from "~/lib/createSqrlInstance";
import { batchUpsert, runEvent } from "~/lib/sqrlExecution";
import { prisma } from "~/server/db";

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

interface BackTestOptions {
  batchSize?: number;
  name?: string;
  description?: string;
}

export async function backTest(
  from: Date,
  to: Date,
  options?: BackTestOptions
) {
  const now = new Date();
  const opts = {
    batchSize: 3000,
    name: `Backtest ${format(now, "yyyy-MM-dd HH:mm:ss")}`,
    ...options,
  };
  const { batchSize, name, description } = opts;

  const count = await prisma.rawEvent.count({
    where: {
      timestamp: {
        gte: from,
        lt: to,
      },
    },
  });
  const batches = Math.ceil(count / batchSize);

  // create the new dataset.

  const { id: datasetId } = await prisma.dataset.create({
    data: {
      name: name,
      createdAt: now,
      description: description,
      start: from,
      end: to,
      eventCount: count,
    },
  });

  // sqrl setup

  const instance = await createSqrlInstance({
    config: {
      "state.allow-in-memory": true,
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

  //

  for (let i = 0; i < batches; i++) {
    const events = await prisma.rawEvent.findMany({
      where: {
        timestamp: {
          gte: from,
          lt: to,
        },
      },
      take: batchSize,
      skip: batchSize * i,
      orderBy: {
        timestamp: "asc",
      },
    });

    const results: Awaited<ReturnType<typeof runEvent>>[] = [];
    for (const msg of events) {
      try {
        results.push(await runEvent(msg as any, executable)); // oops
      } catch (e) {
        console.error(msg);
        console.error(e);
      }
    }

    queue.enqueue(() =>
      batchUpsert(
        {
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
        },
        datasetId
      )
    );
    queue.process().catch(console.error);
  }

  // uhhhh
  process.on("SIGINT", () => {
    process.exit(0);
  });
}

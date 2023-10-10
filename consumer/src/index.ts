import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { Client } from "pg";
import { env } from "./env";
import { Event, compileSqrl, createSqrlInstance, runEvent } from "sqrl-helpers";
import { batchInsertEvents } from "./batchInsertEvents";

if (isMainThread) {
  for (let i = 0; i < 4; i++) {
    const worker = new Worker(__filename, {
      workerData: {
        isProductionWorker: i === 0,
      },
    });
  }
} else {
  const IS_PRODUCTION_WORKER = workerData.isProductionWorker;

  const client = new Client({
    // Your PostgreSQL connection config
    connectionString: env.POSTGRES_URL,
  });

  async function processEvents(props: {
    events: Event[];
    files: Record<string, string>;
    datasetId: bigint;
    isProductionWorker: boolean;
  }) {
    const { events, files, datasetId, isProductionWorker } = props;

    const results: Awaited<ReturnType<typeof runEvent>>[] = [];
    const instance = await createSqrlInstance({
      config: {
        "redis.address": process.env.REDIS_URL,
      },
    });

    const { executable } = await compileSqrl(instance, files);

    for (const event of events) {
      results.push(await runEvent(event, executable, datasetId));
    }
    await batchInsertEvents(results, datasetId);
    if (isProductionWorker) {
      await batchInsertEvents(results, BigInt(0));
    }
  }

  async function getDatasetMetadata() {
    const res = IS_PRODUCTION_WORKER
      ? await client.query(`
      SELECT "Dataset"."id", "lastEventLogId", "backfillFrom", "backfillTo", "rules"
      FROM "Dataset"
      JOIN "DatasetJob" ON "DatasetJob"."datasetId" = "Dataset"."id"
      JOIN "ProductionDatasetLog" ON "ProductionDatasetLog"."datasetId" = "Dataset"."id"
      ORDER BY "ProductionDatasetLog"."createdAt" DESC
      FOR UPDATE OF "DatasetJob"
      SKIP LOCKED
      LIMIT 1
    `)
      : await client.query(`
      SELECT "id", "lastEventLogId", "backfillFrom", "backfillTo", "rules"
      FROM "Dataset"
      JOIN "DatasetJob" ON "DatasetJob"."datasetId" = "Dataset"."id"
      WHERE "id" > 0
      FOR UPDATE OF "DatasetJob" 
      SKIP LOCKED
      LIMIT 1;
    `);
    if (res.rows.length === 0) {
      return null;
    }
    const numDatasets = res.rows.length;
    const randomIndex = Math.floor(Math.random() * numDatasets);
    const dataset = res.rows[randomIndex];

    type FileRow = { name: string; code: string };

    return dataset as {
      id: bigint;
      lastEventLogId: number;
      rules: FileRow[];
    };
  }

  async function initConsumer() {
    try {
      await client.connect();

      while (true) {
        // Sleep for 1 second
        await new Promise((resolve) =>
          setTimeout(resolve, IS_PRODUCTION_WORKER ? 100 : 1000)
        );

        // Start a transaction
        await client.query("BEGIN");

        const dataset = await getDatasetMetadata();

        if (!dataset) {
          // No datasets to process, commit the transaction and continue
          await client.query("COMMIT");
          continue;
        }

        const { id: datasetId, lastEventLogId, rules } = dataset;

        const eventsRes = await client.query(
          `
          SELECT "id", "type", "data", "timestamp"
          FROM "EventLog"
          WHERE "id" > $1
          OR $1 IS NULL
          ORDER BY "id" ASC
          LIMIT 1000;
        `,
          [lastEventLogId]
        );

        const events = eventsRes.rows as Event[];

        if (events.length === 0) {
          // No events to process, commit the transaction and continue
          await client.query("COMMIT");
          continue;
        }

        const files =
          rules.reduce(
            (acc, file) => {
              acc[file.name] = file.code;
              return acc;
            },
            {} as Record<string, string>
          ) || {};

        await processEvents({
          events,
          files,
          datasetId,
          isProductionWorker: IS_PRODUCTION_WORKER,
        });

        const newLastEventId = events.length
          ? events[events.length - 1]!.id
          : lastEventLogId;

        await client.query(
          `
          UPDATE "Dataset"
          SET "lastEventLogId" = $1
          WHERE id = $2;
        `,
          [newLastEventId, datasetId]
        );

        // Commit the transaction
        await client.query("COMMIT");

        console.log(
          `Processed ${events.length} events for dataset ${datasetId}`
        );
      }
    } catch (err) {
      console.error(err);
      // If an error occurs, rollback the transaction
      await client.query("ROLLBACK");
    } finally {
      await client.end();
    }
  }

  initConsumer();
}

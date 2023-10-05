import { Client } from "pg";
import { env } from "./env";
import { Event, batchUpsert, compileSqrl, runEvent } from "./utils";
import { createSqrlInstance } from "./createSqrlInstance";

const client = new Client({
  // Your PostgreSQL connection config
  connectionString: env.POSTGRES_URL,
});

async function processEvents(events: Event[], files: Record<string, string>) {
  const results: Awaited<ReturnType<typeof runEvent>>[] = [];
  const instance = await createSqrlInstance({
    // config: {
    //   "state.allow-in-memory": true,
    // },
    config: {
      "redis.address": process.env.REDIS_URL,
    },
  });

  const { executable } = await compileSqrl(instance, files);

  for (const event of events) {
    try {
      results.push(await runEvent(event, executable));
    } catch (e) {
      console.error(`Error processing event ${event.id}:`);
      console.error(e);
    }
  }
  await batchUpsert(results);
}

async function initConsumer() {
  console.log("Starting backfill job...");
  try {
    await client.connect();

    while (true) {
      // Sleep for 1 second
      await new Promise((resolve) => setTimeout(resolve, 10000));

      // Start a transaction
      await client.query("BEGIN");

      const res = await client.query(`
        SELECT "id", "lastEventId", "datasetId"
        FROM "BackfillJob"
        FOR UPDATE SKIP LOCKED
        LIMIT 1;
      `);

      const job = res.rows[0];
      if (!job) {
        // No open BackfillJob, commit the transaction and continue

        console.log("No open BackfillJob, continuing...");
        await client.query("COMMIT");
        continue;
      }

      const { id: jobId, lastEventId, datasetId } = job;

      const eventsRes = await client.query(
        `
        SELECT "id", "type", "data", "timestamp"
        FROM "EventLog"
        WHERE "id" > $1
        OR $1 IS NULL
        ORDER BY "id" ASC
        LIMIT 1000;
      `,
        [lastEventId]
      );

      const events = eventsRes.rows as Event[];

      if (events.length === 0) {
        // No events to process, commit the transaction and continue
        console.log("No events to process, continuing...");
        await client.query("COMMIT");
        continue;
      }

      type FileRow = { name: string; code?: string };
      const resFiles = await client.query(
        `
        SELECT "name", "currentFileSnapshot"."code"
        FROM "File"
        INNER JOIN "FileSnapshot" AS "currentFileSnapshot"
        ON "currentFileSnapshot"."id" = "File"."currentFileSnapshotId"
        WHERE "File"."datasetId" = $1;
      `,
        [datasetId]
      );

      const files = resFiles.rows as FileRow[];
      const fileData =
        files.reduce(
          (acc, file) => {
            if (!file.code) return acc;
            acc[file.name] = file.code;
            return acc;
          },
          {} as Record<string, string>
        ) || {};

      await processEvents(events, fileData);

      const newLastEventId = events.length
        ? events[events.length - 1]!.id
        : lastEventId;

      await client.query(
        `
        UPDATE "BackfillJob"
        SET "lastEventId" = $1
        WHERE id = $2;
      `,
        [newLastEventId, jobId]
      );

      // Commit the transaction
      await client.query("COMMIT");

      console.log(`Processed ${events.length} events`);
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

import { Client } from "pg";
import { env } from "./env";

const client = new Client({
  // Your PostgreSQL connection config
  connectionString: env.POSTGRES_URL,
});

async function processEvents(events: string[]) {}

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
        SELECT "id", "lastEventId"
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

      const { id: jobId, lastEventId } = job;

      const eventsRes = await client.query(
        `
        SELECT "id"
        FROM "EventLog"
        WHERE "id" > $1
        OR $1 IS NULL
        ORDER BY "id" ASC
        LIMIT 1000;
      `,
        [lastEventId]
      );

      const events = eventsRes.rows;
      await processEvents(events);

      // const newLastEventId = events.length
      //   ? events[events.length - 1].id
      //   : lastEventId;

      // await client.query(
      //   `
      //   UPDATE "BackfillJob"
      //   SET "lastEventId" = $1
      //   WHERE id = $2;
      // `,
      //   [newLastEventId, jobId]
      // );

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

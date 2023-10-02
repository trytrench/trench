import { Client } from "pg";

const env = {
  POSTGRES_URL: process.env.POSTGRES_URL,
  CLICKHOUSE_URL: process.env.CLICKHOUSE_URL,
  REDIS_URL: process.env.REDIS_URL,
};

const client = new Client({
  // Your PostgreSQL connection config
  connectionString: process.env.POSTGRES_URL,
});

async function processEvent(eventId: string) {
  // Your process function implementation
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
        SELECT "id", "lastEventId"
        FROM "BackfillJob"
        WHERE "lastEventId" IS NOT NULL
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
        ORDER BY "id" ASC
        LIMIT 1000;
      `,
        [lastEventId]
      );

      const events = eventsRes.rows;
      for (const event of events) {
        await processEvent(event.id);
      }

      const newLastEventId = events.length
        ? events[events.length - 1].id
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

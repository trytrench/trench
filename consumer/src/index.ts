import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import { Client } from "pg";
import { env } from "./env";
import { Event, compileSqrl, createSqrlInstance, runEvent } from "sqrl-helpers";
import format from "pg-format";
import { batchInsertEvents, processEvents } from "event-processing";
import { db } from "databases";

if (isMainThread) {
  const prodWorker = new Worker(__filename, {
    workerData: {
      isProductionWorker: true,
    },
  });

  for (let i = 0; i < 4; i++) {
    const backfillWorker = new Worker(__filename);
  }

  console.log("Restarted consumers");
} else {
  const IS_PRODUCTION_WORKER = workerData?.isProductionWorker;

  if (IS_PRODUCTION_WORKER) {
    console.log("Starting production worker");
  } else {
    console.log("Starting backfill worker");
  }

  const client = new Client({
    connectionString: env.POSTGRES_URL,
  });

  async function getJobData(props: {
    isProduction: boolean;
    postgresClient: Client;
  }): Promise<{
    jobId: string;
    datasetId: bigint;
    code: Record<string, string>;
    lastEventLogId: string;
    backfillFrom?: Date;
    backfillTo?: Date;
  } | null> {
    const { isProduction, postgresClient } = props;
    if (isProduction) {
      /**
       * datasetId: production dataset ID
       * code: code of latest release version
       */
      const res = await postgresClient.query(`
          SELECT 
            "ConsumerJob"."id" as "jobId",
            "Project"."prodDatasetId" as "datasetId", 
            "ConsumerJob"."lastEventLogId", 
            "Version"."code" as "code"
          FROM "ConsumerJob"
          JOIN "Project" ON "Project"."id" = "ConsumerJob"."projectId"
          JOIN "Release" ON "Release"."projectId" = "Project"."id"
          JOIN "Version" ON "Version"."id" = "Release"."versionId"
          WHERE "ConsumerJob"."type" = 'LIVE'
          AND "ConsumerJob"."status" = 'RUNNING'
          ORDER BY "Release"."createdAt" DESC
          FOR UPDATE OF "ConsumerJob"
          SKIP LOCKED
          LIMIT 1;
        `);

      return res.rows[0] ?? null;
    } else {
      /**
       * datasetId and code are from the backfill configuration
       */
      const res = await postgresClient.query(`
          SELECT 
            "ConsumerJob"."id" as "jobId",
            "Backtest"."datasetId" as "datasetId",
            "ConsumerJob"."lastEventLogId" as "lastEventLogId",
            "Version"."code" as "code",
            "Backtest"."backfillFrom" as "backfillFrom",
            "Backtest"."backfillTo" as "backfillTo"
          FROM "ConsumerJob"
          JOIN "Backtest" ON "Backtest"."id" = "ConsumerJob"."backtestId"
          JOIN "Version" ON "Version"."id" = "Backtest"."versionId"
          WHERE "ConsumerJob"."type" = 'BACKFILL'
          AND "ConsumerJob"."status" = 'RUNNING'
          FOR UPDATE OF "ConsumerJob"
          SKIP LOCKED
          LIMIT 1;
        `);

      return res.rows[0] ?? null;
    }
  }

  async function getEvents(props: {
    lastEventLogId: string;
    isProduction: boolean;
    postgresClient: Client;
  }): Promise<Event[]> {
    const { lastEventLogId, isProduction, postgresClient } = props;

    if (isProduction) {
      const res = await postgresClient.query(
        `
        SELECT "id", "type", "data", "timestamp"
        FROM "EventLog"
        WHERE (
          "id" > $1
          OR $1 IS NULL
        )
        AND (
          NOT ("EventLog"."options" ? 'sync') -- The key 'sync' does not exist
          OR "EventLog"."options"->>'sync' = 'false' -- The key 'sync' exists and its value is 'false'
        )
        ORDER BY "id" ASC
        LIMIT 1000;
      `,
        [lastEventLogId]
      );

      return res.rows as Event[];
    } else {
      const res = await postgresClient.query(
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
      return res.rows as Event[];
    }
  }

  async function initConsumer() {
    try {
      await client.connect();

      while (true) {
        // Sleep for 1 second
        await new Promise((resolve) =>
          setTimeout(resolve, IS_PRODUCTION_WORKER ? 1000 : 1000)
        );

        // Start a transaction
        await client.query("BEGIN");

        const jobData = await getJobData({
          postgresClient: client,
          isProduction: IS_PRODUCTION_WORKER,
        });

        if (!jobData) {
          // No jobs to process, commit the transaction and continue
          await client.query("COMMIT");
          continue;
        }

        const { datasetId, lastEventLogId, code, jobId } = jobData;

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

        const events = await getEvents({
          lastEventLogId,
          isProduction: IS_PRODUCTION_WORKER,
          postgresClient: client,
        });

        if (events.length === 0) {
          // No events to process, commit the transaction and continue
          await client.query("COMMIT");
          continue;
        }

        const results = await processEvents({
          events,
          files: code,
          datasetId,
        });

        await batchInsertEvents({
          events: results,
          clickhouseClient: db,
        });

        const newLastEventId = events.length
          ? events[events.length - 1]!.id
          : lastEventLogId;

        await client.query(
          `
          UPDATE "ConsumerJob"
          SET "lastEventLogId" = $1
          WHERE id = $2;
        `,
          [newLastEventId, jobId]
        );

        // Commit the transaction
        await client.query("COMMIT");

        console.log(
          `Processed ${events.length} events for dataset ${datasetId}`,
          IS_PRODUCTION_WORKER ? "(prod)" : "(backfill)"
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

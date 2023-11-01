import { Worker, isMainThread, workerData } from "worker_threads";
import {
  batchInsertEvents,
  getDatasetData,
  getEvents,
  processEvents,
} from "event-processing";
import { DatasetType, db, prisma } from "databases";

if (isMainThread) {
  const runningThreads = new Map<bigint, Worker>();

  setInterval(manageThreads, 1000);

  async function manageThreads() {
    const datasets = await prisma.dataset.findMany();

    for (const dataset of datasets) {
      const isRunning = !!runningThreads.get(dataset.id);
      const desiredRunStatus = dataset.isActive;

      if (isRunning === desiredRunStatus) {
        continue;
      }

      if (!isRunning) {
        // Start the worker
        const worker = new Worker(__filename, {
          workerData: {
            datasetId: dataset.id,
            isProductionWorker: dataset.type === DatasetType.PRODUCTION,
          },
        });

        runningThreads.set(dataset.id, worker);

        worker.on("exit", (code) => {
          if (code !== 0) {
            console.error(`Worker stopped with exit code ${code}`);
          }
          runningThreads.delete(dataset.id);
        });
      } else {
        runningThreads.get(dataset.id)?.terminate();
      }
    }
  }

  console.log("Restarted consumers");
} else {
  const WORKER_DATA = workerData as {
    datasetId: bigint;
    isProductionWorker: boolean;
  };

  if (WORKER_DATA.isProductionWorker) {
    console.log("Starting production worker");
  } else {
    console.log("Starting backfill worker");
  }

  async function initConsumer() {
    try {
      while (true) {
        // Sleep for 1 second
        await new Promise((resolve) =>
          setTimeout(resolve, WORKER_DATA.isProductionWorker ? 1000 : 1000)
        );

        // Start a transaction
        await prisma.$queryRaw`BEGIN`;

        const jobData = await getDatasetData({
          datasetId: WORKER_DATA.datasetId,
        });

        if (!jobData) {
          // No jobs to process, commit the transaction and continue
          await prisma.$queryRaw`COMMIT`;
          continue;
        }

        const { datasetId, lastEventLogId, code } = jobData;

        const events = await getEvents({
          lastEventLogId,
          isProduction: WORKER_DATA.isProductionWorker,
        });

        if (events.length === 0) {
          // No events to process, commit the transaction and continue
          await prisma.$queryRaw`COMMIT`;
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

        await prisma.$queryRaw`
          UPDATE "Dataset"
          SET "lastEventLogId" = ${newLastEventId}
          WHERE "id" = ${datasetId}
        `;

        // Commit the transaction
        await prisma.$queryRaw`COMMIT`;

        console.log(
          `Processed ${events.length} events for dataset ${datasetId}`,
          WORKER_DATA.isProductionWorker ? "(prod)" : "(backfill)"
        );
      }
    } catch (err) {
      console.error(err);
      // If an error occurs, rollback the transaction
      await prisma.$queryRaw`ROLLBACK`;
    } finally {
      // client.end();
    }
  }

  initConsumer();
}

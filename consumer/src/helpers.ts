import { prisma } from "databases";
import { type } from "os";
import { Client } from "pg";

type DatasetData = {
  datasetId: bigint;
  code: Record<string, string>;
  lastEventLogId: string;
};
export async function getDatasetData(props: {
  datasetId: bigint;
}): Promise<DatasetData> {
  const { datasetId } = props;

  const res = await prisma.$queryRaw<DatasetData[]>`
        SELECT
        "Dataset"."id",
        "EventHandler"."code",
        "Dataset"."lastEventLogId",
        FROM "Dataset"
        JOIN "EventHandlerAssignment" ON "Dataset"."currentEventHandlerAssignmentId" = "EventHandlerAssignment"."id"
        JOIN "EventHandler" ON "EventHandlerAssignment"."eventHandlerId" = "EventHandler"."id"
        WHERE "Dataset"."id" = ${datasetId}
    `;

  if (res.length === 0) {
    throw new Error(`No Dataset found for datasetId ${datasetId}`);
  }

  return res[0]!;
}

type Event = {
  id: string;
  type: string;
  data: Record<string, any>;
  timestamp: Date;
};

export async function getEvents(props: {
  lastEventLogId: string;
  isProduction: boolean;
}): Promise<Event[]> {
  const { lastEventLogId, isProduction } = props;

  if (isProduction) {
    return prisma.$queryRaw<Event[]>`
        SELECT "id", "type", "data", "timestamp"
        FROM "EventLog"
        WHERE (
            "id" > ${lastEventLogId}
            OR ${lastEventLogId} IS NULL
        )
        AND (
            NOT ("EventLog"."options" ? 'sync') -- The key 'sync' does not exist
            OR "EventLog"."options"->>'sync' = 'false' -- The key 'sync' exists and its value is 'false'
        )
        ORDER BY "id" ASC
        LIMIT 1000;
    `;
  } else {
    return prisma.$queryRaw<Event[]>`
        SELECT "id", "type", "data", "timestamp"
        FROM "EventLog"
        WHERE "id" > ${lastEventLogId}
        OR ${lastEventLogId} IS NULL
        ORDER BY "id" ASC
        LIMIT 1000;
    `;
  }
}

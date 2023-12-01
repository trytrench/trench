import { batchInsertEvents, getDatasetData, getEvents } from "event-processing";
import { DatasetType, db, prisma } from "databases";
import { processEvents } from "sqrl-helpers";
import { ExecutionEngine } from "event-processing/src/engine";

var engine: ExecutionEngine | null = null;

async function updateEngine() {}

setInterval(updateEngine, 1000);

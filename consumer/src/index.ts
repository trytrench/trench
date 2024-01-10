import {
  createEngine,
  fetchCurrentEngineId,
  fetchLastEventProcessedId,
  getEventsSince,
  setLastEventProcessedId,
} from "event-processing";
import { EngineResult, ExecutionEngine } from "event-processing/src/engine";
import { recordEventType } from "./recordEventType";
import {
  StoreRow,
  writeStoreRows,
} from "event-processing/src/node-type-defs/lib/store";

var engine: ExecutionEngine | null = null;
setInterval(async () => {
  // Check database for new engine, and update in-memory engine if necessary
  const engineId = await fetchCurrentEngineId();
  if (engineId !== engine?.engineId) {
    if (engineId) {
      engine = await createEngine({ engineId });
      console.log("Switched to engine:", engineId);
    } else {
      engine = null;
    }
  }
}, 1000);

initEventHandler();

async function initEventHandler() {
  while (true) {
    if (!engine) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    const lastEventProcessedId = await fetchLastEventProcessedId();
    const events = await getEventsSince({ lastEventProcessedId, limit: 3000 });
    if (events.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    try {
      const storeRows: StoreRow[] = [];
      for (const eventObj of events) {
        engine.initState(eventObj.event);
        await recordEventType(eventObj.event.type, eventObj.event.data);
        const results = await engine.getAllEngineResults();
        await engine.executeStateUpdates();
        storeRows.push(...(engine.state?.savedStoreRows ?? []));
      }

      await writeStoreRows({ rows: storeRows });

      const lastEvent = events[events.length - 1]!;
      await setLastEventProcessedId(lastEvent.event.id);
      console.log(`Processed ${events.length} events`);
    } catch (e) {
      console.error("Error processing events", e);
    }
  }
}

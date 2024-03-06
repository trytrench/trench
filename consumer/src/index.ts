import {
  createEngine,
  fetchCurrentEngineId,
  fetchLastEventProcessedId,
  getEventsSince,
  setLastEventProcessedId,
  ExecutionEngine,
} from "event-processing/src/server";
import { recordEventType } from "./recordEventType";
import {
  StoreRow,
  StoreTable,
  writeStoreRows,
} from "event-processing/src/function-type-defs/lib/store";
import { getUnixTime } from "date-fns";

const PAUSE_ENGINE = true;
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
    if (PAUSE_ENGINE) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    if (!engine) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    const lastEventProcessedId = await fetchLastEventProcessedId();
    const eventObjs = await getEventsSince({
      lastEventProcessedId,
      limit: 1000,
    });
    if (eventObjs.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    try {
      const trenchEvents = eventObjs.map((obj) => obj.event);
      await Promise.all(
        trenchEvents.map((event) => recordEventType(event.type, event))
      );

      engine.initState(eventObjs.map((obj) => obj.event));
      const { savedStoreRows } = await engine.executeToCompletion();

      const eventRows: StoreRow[] = trenchEvents.map((event) => ({
        table: StoreTable.Events,
        row: {
          id: event.id,
          type: event.type,
          data: event.data,
          timestamp: event.timestamp.getTime(),
        },
      }));

      await Promise.all([
        writeStoreRows({ rows: savedStoreRows }),
        writeStoreRows({ rows: eventRows }),
      ]);

      const lastEvent = eventObjs[eventObjs.length - 1]!;
      await setLastEventProcessedId(lastEvent.event.id);
      console.log(`Processed ${eventObjs.length} events`);
    } catch (e) {
      console.error("Error processing events", e);
    }
  }
}

import {
  createEngine,
  fetchCurrentEngineId,
  fetchLastEventProcessedId,
  getEventsSince,
  setLastEventProcessedId,
  ExecutionEngine,
} from "event-processing/src/server";
import { recordEventType } from "./recordEventType";
import { writeStoreRows } from "event-processing/src/function-type-defs/lib/store";

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
    const eventObjs = await getEventsSince({
      lastEventProcessedId,
      limit: 3000,
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
      await writeStoreRows({ rows: savedStoreRows });

      const lastEvent = eventObjs[eventObjs.length - 1]!;
      await setLastEventProcessedId(lastEvent.event.id);
      console.log(`Processed ${eventObjs.length} events`);
    } catch (e) {
      console.error("Error processing events", e);
    }
  }
}

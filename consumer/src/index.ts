import {
  createEngine,
  fetchCurrentEngineId,
  fetchLastEventProcessedId,
  getEventsSince,
  setLastEventProcessedId,
  writeEngineResultsToStore,
  writeEventsToStore,
} from "event-processing";
import { EngineResult, ExecutionEngine } from "event-processing/src/engine";

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
    const events = await getEventsSince({ lastEventProcessedId });
    if (events.length === 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    }

    try {
      const allResults: EngineResult[] = [];
      for (const eventObj of events) {
        engine.initState(eventObj.event);
        const results = await engine.getAllEngineResults();
        allResults.push(...Object.values(results));
      }

      await engine.executeStateUpdates();
      await writeEngineResultsToStore({ results: allResults });
      await writeEventsToStore({ events: events.map((e) => e.event) });

      const lastEvent = events[events.length - 1]!;
      await setLastEventProcessedId(lastEvent.event.id);
    } catch (e) {
      console.error("Error processing events", e);
    }
  }
}

import {
  EngineResult,
  createEngine,
  fetchCurrentEngineId,
  fetchLastEventProcessedId,
  getEventsSince,
  setLastEventProcessedId,
  writeEventsAndFeaturesToStore,
} from "event-processing";
import { ExecutionEngine } from "event-processing/src/engine";

var engine: ExecutionEngine | null = null;
setInterval(async () => {
  // Check database for new engine, and update in-memory engine if necessary
  const engineId = await fetchCurrentEngineId();
  if (engineId !== engine?.engineId) {
    if (engineId) {
      engine = await createEngine({ engineId });
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
      const results: EngineResult[] = [];
      for (const eventObj of events) {
        engine.initState(eventObj.event);
        const features = await engine.getAllFeatures();
        results.push({
          event: eventObj.event,
          featureResults: features,
        });
      }

      await engine.executeStateUpdates();
      await writeEventsAndFeaturesToStore({ results });

      const lastEvent = events[events.length - 1]!;
      await setLastEventProcessedId(lastEvent.event.id);
    } catch (e) {
      console.error("Error processing events", e);
    }
  }
}

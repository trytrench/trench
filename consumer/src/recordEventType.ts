import { prisma } from "databases";
import {
  FnType,
  TrenchEvent,
  inferSchemaFromJsonObject,
} from "event-processing";

var seenEventTypes = new Set<string>();

export async function recordEventType(
  eventType: string,
  exampleEvent: TrenchEvent
) {
  if (seenEventTypes.has(eventType)) {
    return;
  }
  seenEventTypes.add(eventType);

  const schema = inferSchemaFromJsonObject({
    id: exampleEvent.id,
    type: exampleEvent.type,
    timestamp: exampleEvent.timestamp.toISOString(),
    data: exampleEvent.data,
  });

  await prisma.eventType.upsert({
    where: {
      id: eventType,
    },
    create: {
      id: eventType,
      nodes: {
        create: [
          {
            name: `Event: ${eventType}`,
            snapshots: {
              create: {
                inputs: {},
                function: {
                  create: {
                    name: `Event: ${eventType}`,
                    type: FnType.Event,
                    config: {},
                    returnSchema: schema as any,
                  },
                },
              },
            },
          },
        ],
      },
    },
    update: {},
  });
}

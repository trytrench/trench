import { prisma } from "databases";
import {
  NodeType,
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
            type: NodeType.Event,
            name: `Event: ${eventType}`,
            snapshots: {
              create: {
                returnSchema: schema as any,
                config: {},
              },
            },
          },
        ],
      },
    },
    update: {},
  });
}

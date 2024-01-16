import { prisma } from "databases";
import { inferSchemaFromJsonObject } from "event-processing";

var seenEventTypes = new Set<string>();

export async function recordEventType(eventType: string, exampleEvent: any) {
  if (seenEventTypes.has(eventType)) {
    return;
  }
  seenEventTypes.add(eventType);

  const schema = inferSchemaFromJsonObject(exampleEvent);

  await prisma.eventType.upsert({
    where: {
      type: eventType,
    },
    create: {
      type: eventType,
      exampleEvent: exampleEvent,
      schema: schema as any,
    },
    update: {
      exampleEvent: exampleEvent,
      schema: schema as any,
    },
  });
}

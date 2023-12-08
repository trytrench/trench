import { prisma } from "databases";

var seenEventTypes = new Set<string>();

export function recordEventType(eventType: string, exampleEvent: any) {
  if (seenEventTypes.has(eventType)) {
    return;
  }
  seenEventTypes.add(eventType);

  prisma.eventType.upsert({
    where: {
      type: eventType,
    },
    create: {
      type: eventType,
      exampleEvent: JSON.stringify(exampleEvent),
    },
    update: {},
  });
}

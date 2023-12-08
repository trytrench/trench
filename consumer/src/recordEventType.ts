import { prisma } from "databases";

var seenEventTypes = new Set<string>();

export async function recordEventType(eventType: string, exampleEvent: any) {
  if (seenEventTypes.has(eventType)) {
    return;
  }
  seenEventTypes.add(eventType);

  await prisma.eventType.upsert({
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

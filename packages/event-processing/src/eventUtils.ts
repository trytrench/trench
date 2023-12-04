import { GlobalStateKey, prisma } from "databases";
import { TrenchEvent } from "./feature-type-defs/featureTypeDef";

export async function fetchLastEventProcessedId(): Promise<string | null> {
  const state = await prisma.globalState.findUnique({
    where: { key: GlobalStateKey.LastEventProcessedId },
  });
  return state?.value ?? null;
}

export async function setLastEventProcessedId(id: string) {
  await prisma.globalState.upsert({
    where: { key: GlobalStateKey.LastEventProcessedId },
    update: { value: id },
    create: { key: GlobalStateKey.LastEventProcessedId, value: id },
  });
}

export async function getEventsSince({
  lastEventProcessedId,
  limit = 1000,
}: {
  lastEventProcessedId: string | null;
  limit?: number;
}): Promise<{ event: TrenchEvent; options: object }[]> {
  const events = await prisma.event.findMany({
    where: {
      id: {
        gt: lastEventProcessedId ?? undefined,
      },
    },
    orderBy: {
      id: "asc",
    },
    take: limit,
  });

  return events.map((event) => ({
    event: {
      id: event.id,
      type: event.type,
      data: event.data as object,
      timestamp: event.timestamp,
    },
    options: event.options as object,
  }));
}

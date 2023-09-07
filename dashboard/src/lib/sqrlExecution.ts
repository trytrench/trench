import { type Prisma } from "@prisma/client";
import { uniqBy } from "lodash";
import { customAlphabet } from "nanoid";
import { createSimpleContext, type Executable } from "sqrl";
import { SqrlManipulator } from "~/lib/SqrlManipulator";
import { prisma } from "~/server/db";

export interface Event {
  timestamp: string;
  type: string;
  data: any;
}

const nanoid = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  21
);

export async function runEvent(event: Event, executable: Executable) {
  const ctx = createSimpleContext();
  const manipulator = new SqrlManipulator();

  const execution = await executable.execute(ctx, {
    manipulator,
    inputs: {
      EventData: event,
    },
    featureTimeoutMs: 10000,
  });

  const completePromise = execution.fetchFeature("SqrlExecutionComplete");

  const features: Record<string, unknown> = {};
  const allFeatures = executable.getFeatures();

  await Promise.all(
    allFeatures.map(async (name) => {
      features[name] = (await execution.fetchValue(name)) as unknown;
    })
  );

  await completePromise;
  await manipulator.mutate(ctx);

  const TIMESTAMP = new Date(event.timestamp);
  const EVENT_ID = nanoid();

  const eventFeatures: Record<string, unknown> = {};
  manipulator.eventFeatures.forEach((feature) => {
    eventFeatures[feature.name] = feature.value;
  });

  const events = [
    {
      id: EVENT_ID,
      type: event.type,
      timestamp: TIMESTAMP,
      data: event.data,
      features: eventFeatures,
    },
  ];

  const mapEntityIdToFeatures: Record<string, Record<string, unknown>> = {};
  manipulator.entityFeatures.forEach((feature) => {
    if (!mapEntityIdToFeatures[feature.entityId]) {
      mapEntityIdToFeatures[feature.entityId] = {};
    }

    const fieldsObj = mapEntityIdToFeatures[feature.entityId];
    if (fieldsObj) {
      fieldsObj[feature.name] = feature.value;
    }
  });

  const entities = manipulator.entities.map((entity) => ({
    ...entity,
    eventId: EVENT_ID,
    timestamp: TIMESTAMP,
    features: mapEntityIdToFeatures[entity.id] ?? {},
  }));

  const entityLabelsToAdd = manipulator.entityLabels
    .filter((entityLabel) => entityLabel.action === "add")
    .map((entityLabel) => ({
      ...entityLabel,
      timestamp: TIMESTAMP,
    }));

  const entityLabelsToRemove = manipulator.entityLabels
    .filter((entityLabel) => entityLabel.action === "remove")
    .map((entityLabel) => ({
      ...entityLabel,
      timestamp: TIMESTAMP,
    }));

  const eventLabels = manipulator.eventLabels.map((eventLabel) => ({
    ...eventLabel,
    eventType: event.type,
    timestamp: TIMESTAMP,
    eventId: EVENT_ID,
  }));

  const entityToEventLinks = manipulator.entities.map((entity) => ({
    timestamp: TIMESTAMP,
    type: entity.relation,
    eventId: EVENT_ID,
    entityId: entity.id,
  }));

  return {
    events,
    entities,
    entityLabelsToAdd,
    entityLabelsToRemove,
    eventLabels,
    entityToEventLinks,
  };
}

export async function batchUpsert({
  events,
  entities,
  entityLabelsToAdd,
  eventLabels,
  entityToEventLinks,
}: Awaited<ReturnType<typeof runEvent>>) {
  await prisma.$transaction([
    prisma.eventType.createMany({
      data: uniqBy(events, (event) => event.type).map((event) => ({
        id: event.type,
        name: event.type,
      })),
      skipDuplicates: true,
    }),
    prisma.entityType.createMany({
      data: uniqBy(entities, (entity) => entity.type).map((entity) => ({
        id: entity.type,
        name: entity.type,
      })),
      skipDuplicates: true,
    }),
    prisma.linkType.createMany({
      data: uniqBy(entityToEventLinks, (link) => link.type).map((link) => ({
        id: link.type,
        name: link.type,
      })),
      skipDuplicates: true,
    }),
    prisma.eventLabelType.createMany({
      data: uniqBy(eventLabels, (eventLabel) => eventLabel.type).map(
        (eventLabel) => ({
          id: eventLabel.type,
          name: eventLabel.type,
          description: "desc",
        })
      ),
      skipDuplicates: true,
    }),
    prisma.entityLabelType.createMany({
      data: uniqBy(
        entityLabelsToAdd,
        (entityLabel) => entityLabel.labelType
      ).map((entityLabel) => ({
        id: entityLabel.labelType,
        name: entityLabel.labelType,
        description: "desc",
      })),
      skipDuplicates: true,
    }),
    prisma.event.createMany({
      data: events.map((event) => ({
        id: event.id,
        type: event.type,
        timestamp: event.timestamp,
        data: event.data as Prisma.JsonObject,
        features: event.features as Prisma.JsonObject,
      })),
      skipDuplicates: true,
    }),
    prisma.eventFeature.createMany({
      data: events.flatMap((event) =>
        Object.entries(event.features).map(([name, value]) => ({
          name,
          eventType: event.type,
        }))
      ),
      skipDuplicates: true,
    }),
  ]);

  //   console.timeLog("Batch upserts", "Upserted label types");
  await Promise.all([
    prisma.entity.createMany({
      data: entities.map((entity) => ({
        id: entity.id,
        type: entity.type,
        name: (entity.features.Name as string) || entity.id,
        features: entity.features as Prisma.JsonObject,
      })),
      skipDuplicates: true,
    }),
    // Upsert all event labels
    prisma.eventLabel.createMany({
      data: eventLabels.map((eventLabel) => ({
        id: `${eventLabel.eventType}-${eventLabel.type}-${eventLabel.label}`,
        name: eventLabel.label,
        eventType: eventLabel.eventType,
        createdAt: eventLabel.timestamp,
        color: "",
        description: "Test",
        labelType: eventLabel.type,
      })),
      skipDuplicates: true,
    }),
    // Upsert all entity labels
    prisma.entityLabel.createMany({
      data: entityLabelsToAdd.map((entityLabel) => ({
        id: `${entityLabel.entityType}-${entityLabel.labelType}-${entityLabel.label}`,
        name: entityLabel.label,
        entityType: entityLabel.entityType,
        createdAt: entityLabel.timestamp,
        color: "",
        description: "Test",
        labelType: entityLabel.labelType,
      })),
      skipDuplicates: true,
    }),
  ]);

  //   console.timeLog("Batch upserts", "Upserted events, entities, labels");

  await Promise.all([
    prisma.eventToEntityLink.createMany({
      data: entityToEventLinks.map((link) => ({
        eventId: link.eventId,
        entityId: link.entityId,
        type: link.type,
        createdAt: link.timestamp,
      })),
      skipDuplicates: true,
    }),
    ...(entityLabelsToAdd.length > 0
      ? [
          prisma.$executeRawUnsafe(`
          INSERT INTO "_EntityToEntityLabel" ("A", "B")
          VALUES ${uniqBy(
            entityLabelsToAdd,
            (entityLabel) => `${entityLabel.entityId}-${entityLabel.label}`
          )
            .map(
              (entityLabel) =>
                `('${entityLabel.entityId}', '${entityLabel.entityType}-${entityLabel.labelType}-${entityLabel.label}')`
            )
            .join(",")}
          ON CONFLICT ("A", "B") DO NOTHING;
      `),
        ]
      : []),
    ...(eventLabels.length > 0
      ? [
          prisma.$executeRawUnsafe(`
          INSERT INTO "_EventToEventLabel" ("A", "B")
          VALUES ${uniqBy(
            eventLabels,
            (eventLabel) => `${eventLabel.eventId}-${eventLabel.label}`
          )
            .map(
              (eventLabel) =>
                `('${eventLabel.eventId}', '${eventLabel.eventType}-${eventLabel.type}-${eventLabel.label}')`
            )
            .join(",")}
          ON CONFLICT ("A", "B") DO NOTHING;
      `),
        ]
      : []),
  ]);
}

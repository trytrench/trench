import { Prisma } from "@prisma/client";
import { da } from "date-fns/locale";
import { uniqBy } from "lodash";
import { customAlphabet } from "nanoid";
import { createSimpleContext, type Executable } from "sqrl";
import { SqrlManipulator } from "~/lib/SqrlManipulator";
import data from "~/scripts/loadData";
import { prisma } from "~/server/db";
import { RouterOutputs } from "~/utils/api";

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

  const TIMESTAMP = event.timestamp ? new Date(event.timestamp) : new Date();
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
    entityType: entity.type,
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

// TODO: temp
export async function batchUpsertRawEvents(events: Event[]) {
  await prisma.$transaction([
    prisma.rawEvent.createMany({
      data: events,
      skipDuplicates: true, // TODO: remove - there shouldn't be duplicates.
    }),
  ]);
}

export async function batchUpsert(
  {
    events,
    entities,
    entityLabelsToAdd,
    eventLabels,
    entityToEventLinks,
  }: Awaited<ReturnType<typeof runEvent>>,
  datasetId: number = 0
) {
  await prisma.$transaction([
    prisma.eventType.createMany({
      data: uniqBy(events, (event) => event.type).map((event) => ({
        id: event.type,
        name: event.type,
        datasetId,
      })),
      skipDuplicates: true,
    }),
    prisma.entityType.createMany({
      data: uniqBy(entities, (entity) => entity.type).map((entity) => ({
        id: entity.type,
        name: entity.type,
        datasetId,
      })),
      skipDuplicates: true,
    }),
    prisma.linkType.createMany({
      data: uniqBy(entityToEventLinks, (link) => link.type).map((link) => ({
        id: link.type,
        name: link.type,
        datasetId,
      })),
      skipDuplicates: true,
    }),
    prisma.eventLabelType.createMany({
      data: uniqBy(eventLabels, (eventLabel) => eventLabel.type).map(
        (eventLabel) => ({
          id: eventLabel.type,
          name: eventLabel.type,
          description: "desc",
          datasetId,
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
        datasetId,
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
        datasetId,
      })),
      skipDuplicates: true,
    }),
    prisma.eventFeature.createMany({
      data: events.flatMap((event) =>
        Object.entries(event.features).map(([name, value]) => ({
          name,
          eventType: event.type,
          datasetId,
        }))
      ),
      skipDuplicates: true,
    }),
    prisma.entityFeature.createMany({
      data: entities.flatMap((entity) =>
        Object.entries(entity.features).map(([name, value]) => ({
          name,
          entityType: entity.type,
        }))
      ),
      skipDuplicates: true,
    }),
  ]);

  // helper for upserting entities
  const createEntityEntry = (entity: (typeof entities)[number]) => {
    const entityId = `${entity.type}-${entity.id}-${datasetId}`;
    const entityName = (entity.features.Name as string) || entity.id;

    return Prisma.sql`
      (${entityId}, ${entity.type}, ${entityName}, ${entity.features}, ${datasetId})
    `;
  };

  await Promise.all([
    // Upsert all entities
    await prisma.$executeRaw`
      INSERT INTO "Entity" ("id", "type", "name", "features", "datasetId") VALUES
      ${Prisma.join(
        uniqBy(entities, (entity) => entity.id).map(createEntityEntry)
      )}
      ON CONFLICT (id) DO UPDATE SET "features" = EXCLUDED."features";
    `,

    // Upsert all event labels
    prisma.eventLabel.createMany({
      data: eventLabels.map((eventLabel) => ({
        id: `${eventLabel.eventType}-${eventLabel.type}-${eventLabel.label}-${datasetId}`,
        name: eventLabel.label,
        eventType: eventLabel.eventType,
        createdAt: eventLabel.timestamp,
        color: "",
        description: "Test",
        labelType: eventLabel.type,
        datasetId,
      })),
      skipDuplicates: true,
    }),
    // Upsert all entity labels
    prisma.entityLabel.createMany({
      data: entityLabelsToAdd.map((entityLabel) => ({
        id: `${entityLabel.entityType}-${entityLabel.labelType}-${entityLabel.label}-${datasetId}`,
        name: entityLabel.label,
        entityType: entityLabel.entityType,
        createdAt: entityLabel.timestamp,
        color: "",
        description: "Test",
        labelType: entityLabel.labelType,
        datasetId,
      })),
      skipDuplicates: true,
    }),
  ]);

  //   console.timeLog("Batch upserts", "Upserted events, entities, labels");

  await Promise.all([
    prisma.eventToEntityLink.createMany({
      data: entityToEventLinks.map((link) => ({
        eventId: link.eventId,
        entityId: `${link.entityType}-${link.entityId}-${datasetId}`,
        type: link.type,
        createdAt: link.timestamp,
        datasetId,
      })),
      skipDuplicates: true,
    }),
    prisma.entityLabelToEntity.createMany({
      data: entityLabelsToAdd.map((entityLabel) => ({
        entityId: `${entityLabel.entityType}-${entityLabel.entityId}-${datasetId}`,
        entityLabelId: `${entityLabel.entityType}-${entityLabel.labelType}-${entityLabel.label}-${datasetId}`,
        datasetId,
      })),
      skipDuplicates: true,
    }),
    prisma.eventLabelToEvent.createMany({
      data: eventLabels.map((eventLabel) => ({
        eventId: eventLabel.eventId,
        eventLabelId: `${eventLabel.eventType}-${eventLabel.type}-${eventLabel.label}-${datasetId}`,
        datasetId,
      })),
      skipDuplicates: true,
    }),

    // ...(entityLabelsToAdd.length > 0
    //   ? [
    //       prisma.$executeRawUnsafe(`
    //       INSERT INTO "_EntityToEntityLabel" ("A", "B")
    //       VALUES ${uniqBy(
    //         entityLabelsToAdd,
    //         (entityLabel) =>
    //           `${entityLabel.entityType}-${entityLabel.entityId}-${entityLabel.entityType}-${entityLabel.labelType}-${entityLabel.label}`
    //       )
    //         .map(
    //           (entityLabel) =>
    //             `('${entityLabel.entityType}-${entityLabel.entityId}', '${entityLabel.entityType}-${entityLabel.labelType}-${entityLabel.label}')`
    //         )
    //         .join(",")}
    //       ON CONFLICT ("A", "B") DO NOTHING;
    //   `),
    //     ]
    //   : []),
    // ...(eventLabels.length > 0
    //   ? [
    //       prisma.$executeRawUnsafe(`
    //       INSERT INTO "_EventToEventLabel" ("A", "B")
    //       VALUES ${uniqBy(
    //         eventLabels,
    //         (eventLabel) => `${eventLabel.eventId}-${eventLabel.label}`
    //       )
    //         .map(
    //           (eventLabel) =>
    //             `('${eventLabel.eventId}', '${eventLabel.eventType}-${eventLabel.type}-${eventLabel.label}')`
    //         )
    //         .join(",")}
    //       ON CONFLICT ("A", "B") DO NOTHING;
    //   `),
    //     ]
    //   : []),
  ]);
}

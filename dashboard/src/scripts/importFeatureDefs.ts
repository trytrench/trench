import { PrismaClient, GlobalStateKey } from "@prisma/client";
import data from "./featureDefs.json";

const prisma = new PrismaClient({
  datasourceUrl:
    "postgresql://postgres:postgres@localhost:5432/postgres?schema=public",
});

const featureDefs = data as any;

async function main() {
  await Promise.all(
    featureDefs.map(async (fd: any) => {
      // upsert
      const snapshots = fd.snapshots.map((snapshot: any) => ({
        id: snapshot.id,
        eventTypes: snapshot.eventTypes,
        deps: snapshot.deps,
        config: snapshot.config,
        createdAt: snapshot.createdAt,
      }));

      const res = await prisma.featureDef.create({
        data: {
          id: fd.id,
          type: fd.type,
          name: fd.name,
          dataType: fd.dataType,
          createdAt: fd.createdAt,
          updatedAt: fd.updatedAt,

          snapshots: {
            create: snapshots,
          },
        },
      });

      console.log(`Added featureDef: ${res.name}`);
    })
  );

  const latestFeatureSnapshots = await prisma.featureDef.findMany({
    include: {
      snapshots: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  const engine = await prisma.executionEngine.create({
    data: {
      featureDefSnapshots: {
        createMany: {
          data: latestFeatureSnapshots.map((featureDef) => ({
            featureDefSnapshotId: featureDef.snapshots[0]!.id,
          })),
        },
      },
    },
  });

  await prisma.globalState.upsert({
    where: {
      key: GlobalStateKey.ActiveEngineId,
    },
    create: {
      key: GlobalStateKey.ActiveEngineId,
      value: engine.id,
    },
    update: {
      value: engine.id,
    },
  });
}

main().catch((error) => {
  console.log(error);
});

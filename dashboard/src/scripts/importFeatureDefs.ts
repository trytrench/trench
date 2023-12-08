import { PrismaClient, Prisma } from "@prisma/client";
import data from "./featureDefs.json";

const prisma = new PrismaClient({
  datasourceUrl:
    "postgresql://postgres:postgres@localhost:5432/postgres?schema=public",
});

const featureDefs = data as any;

async function main() {
  featureDefs.forEach(async (fd: any) => {
    // upsert
    const snapshots = fd.snapshots.map((snapshot: any) => ({
      eventTypes: snapshot.eventTypes,
      deps: snapshot.deps,
      config: snapshot.config,
      createdAt: snapshot.createdAt,
    }));

    const res = await prisma.featureDef.create({
      data: {
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
  });
}

main().catch((error) => {
  console.log(error);
});

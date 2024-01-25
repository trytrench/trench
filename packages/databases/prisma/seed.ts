import { readdir, readFile } from "fs/promises";
import path from "path";
import { GlobalStateKey, prisma } from "..";

async function main() {}

main()
  .then(async () => {
    const executionEngine = await prisma.executionEngine.create({});

    await prisma.globalState.create({
      data: {
        key: GlobalStateKey.ActiveEngineId,
        value: executionEngine.id,
      },
    });

    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

import { GlobalStateKey, prisma } from "..";

async function main() {}

main()
  .then(async () => {
    const engines = await prisma.executionEngine.findMany();

    if (!engines.length) {
      const engine = await prisma.executionEngine.create({});

      await prisma.globalState.create({
        data: {
          key: GlobalStateKey.ActiveEngineId,
          value: engine.id,
        },
      });
    }

    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

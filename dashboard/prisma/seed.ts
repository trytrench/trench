import { prisma } from "~/server/db";
import { readFile } from "fs/promises";
import path from "path";
import { glob } from "glob";

async function main() {
  const files = await glob(
    path.resolve(__dirname, "../src/rules/*.{sqrl,txt}")
  );

  for (const file of files) {
    const source = await readFile(file, "utf-8");
    await prisma.file.create({
      data: {
        name: path.basename(file),
        currentFileSnapshot: {
          create: {
            code: source,
            version: "0.0.0",
          },
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

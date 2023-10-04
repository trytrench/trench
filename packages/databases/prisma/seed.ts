import { readFile } from "fs/promises";
import path from "path";
import { glob } from "glob";
import { prisma } from "..";

async function main() {
  const files = await glob(
    path.resolve(__dirname, "../src/rules/*.{sqrl,txt}"),
    () => {}
  );
  const fileData = await Promise.all(
    files.found.map(async (file) => {
      const source = await readFile(file, "utf-8");
      return {
        name: file,
        source,
      };
    })
  );

  for (const file of fileData) {
    await prisma.file.create({
      data: {
        name: path.basename(file.name),
        currentFileSnapshot: {
          create: {
            code: file.source,
          },
        },
        ruleset: {
          create: {
            name: "Version 0.0.0",
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

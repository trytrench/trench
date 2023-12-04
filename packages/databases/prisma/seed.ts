import { readdir, readFile } from "fs/promises";
import path from "path";
import { hashEventHandler } from "sqrl-helpers";
import { prisma } from "..";

async function readFiles(dirPath: string): Promise<Record<string, string>> {
  try {
    const filenames = await readdir(dirPath);
    const filesData = await Promise.all(
      filenames.map(async (filename) => {
        const filePath = path.join(dirPath, filename);
        const data = await readFile(filePath, "utf8");
        return [filename, data];
      })
    );

    return Object.fromEntries(filesData);
  } catch (err) {
    console.error("Error reading files:", err);
    throw err;
  }
}

async function main() {
  const code = await readFiles(__dirname + "/rules");
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

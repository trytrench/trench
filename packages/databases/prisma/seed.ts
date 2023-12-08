import { readdir, readFile } from "fs/promises";
import path from "path";
import { prisma } from "..";

async function main() {}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

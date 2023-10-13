import { prisma } from "..";
import { readdir, readFile } from "fs/promises";
import path from "path";

async function readFiles(dirPath: string) {
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
  const fileData = await readFiles(__dirname + "/rules");

  const project = await prisma.project.create({
    data: {
      name: "Test Project",
      releases: {
        create: [
          {
            version: "0.0.0",
            description: "Initial release",
            code: fileData,
          },
        ],
      },
    },
    include: { releases: true },
  });

  const prodDataset = await prisma.dataset.create({
    data: {
      description: "Production",
      release: { connect: { id: project.releases[0].id } },
      prodProject: { connect: { id: project.id } },
    },
  });
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

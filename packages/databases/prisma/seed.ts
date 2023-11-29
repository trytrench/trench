import { prisma } from "..";
import { readdir, readFile } from "fs/promises";
import path from "path";
import { hashEventHandler } from "sqrl-helpers";

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

  const project = await prisma.project.create({
    data: {
      name: "production",
    },
  });

  const eventHandler = await prisma.eventHandler.create({
    data: {
      message: "Initial event handler",
      code: code,
      hash: hashEventHandler({ code }),
      project: {
        connect: {
          id: project.id,
        },
      },
    },
  });

  const prodDataset = await prisma.dataset.create({
    data: {
      name: "production",
      type: "PRODUCTION",
      projectId: project.id,
    },
  });

  const assignment = await prisma.eventHandlerAssignment.create({
    data: {
      datasetId: prodDataset.id,
      eventHandlerId: eventHandler.id,
    },
  });

  await prisma.dataset.update({
    where: { id: prodDataset.id },
    data: {
      currentEventHandlerAssignmentId: assignment.id,
    },
  });

  await prisma.project.update({
    where: { id: project.id },
    data: {
      productionDatasetId: prodDataset.id,
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

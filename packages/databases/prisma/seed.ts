import { ConsumerJobStatus, ConsumerJobType } from "@prisma/client";
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

  const dataset = await prisma.dataset.create({
    data: {},
  });
  const project = await prisma.project.create({
    data: {
      name: "production",
      prodDatasetId: dataset.id,
      versions: {
        create: {
          version: "0.0.0",
          description: "Initial release",
          code: fileData,
        },
      },
    },
    include: {
      versions: true,
    },
  });

  const version = project.versions[0]!;

  const release = await prisma.release.create({
    data: {
      projectId: project.id,
      versionId: version.id,
    },
  });

  const consumerJob = await prisma.consumerJob.create({
    data: {
      projectId: project.id,
      type: ConsumerJobType.LIVE,
      status: ConsumerJobStatus.RUNNING,
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

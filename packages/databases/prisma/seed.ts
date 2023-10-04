import { readFile } from "fs/promises";
import { glob } from "glob";
import { prisma } from "..";

import * as fs from "fs";
import * as path from "path";

interface FileData {
  fileName: string;
  code: string;
}

async function readTextAndSqrlFiles(directory: string): Promise<FileData[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(directory, (err, files) => {
      if (err) {
        reject(err);
        return;
      }

      const textAndSqrlFiles = files.filter((file) => {
        const ext = path.extname(file);
        return ext === ".txt" || ext === ".sqrl";
      });

      const fileDataArray: FileData[] = [];

      let remainingFiles = textAndSqrlFiles.length;
      if (remainingFiles === 0) {
        resolve(fileDataArray); // Resolve early if there are no text or sqrl files
      } else {
        textAndSqrlFiles.forEach((file) => {
          fs.readFile(path.join(directory, file), "utf8", (err, data) => {
            if (err) {
              reject(err); // Reject the promise if there's an error reading a file
              return;
            }

            const fileData: FileData = {
              fileName: path.basename(file),
              code: data,
            };

            fileDataArray.push(fileData);
            remainingFiles -= 1;

            if (remainingFiles === 0) {
              resolve(fileDataArray); // Resolve the promise once all files have been read
            }
          });
        });
      }
    });
  });
}

async function main() {
  const fileData = await readTextAndSqrlFiles(__dirname + "/rules");

  const firstRuleset = await prisma.ruleset.create({
    data: {
      name: "Version 0.0.0",
    },
  });

  for (const file of fileData) {
    const fileSnapshot = await prisma.fileSnapshot.create({
      data: {
        code: file.code,
      },
    });
    await prisma.file.create({
      data: {
        name: path.basename(file.fileName),
        currentFileSnapshotId: fileSnapshot.id,
        rulesetId: firstRuleset.rulesetId,
      },
    });
  }

  const job = await prisma.backfillJob.create({
    data: {
      rulesetId: firstRuleset.rulesetId,
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

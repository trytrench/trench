import { Prisma } from "@prisma/client";
import { prisma } from "..";

import * as fs from "fs";
import * as path from "path";

interface FileData {
  name: string;
  source: string;
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
              name: path.basename(file),
              source: data,
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
      files: fileData as any,
    },
  });

  const prod = await prisma.productionRuleset.create({
    data: {
      rulesetId: firstRuleset.id,
    },
  });

  const job = await prisma.backfillJob.create({
    data: {
      rulesetId: firstRuleset.id,
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

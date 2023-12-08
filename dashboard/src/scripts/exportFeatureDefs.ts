import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient({
  datasourceUrl:
    "postgresql://postgres:postgres@localhost:5432/postgres?schema=public",
});

async function main() {
  // get all featureDefs and snapshots.
  const res = await prisma.featureDef.findMany({
    include: {
      snapshots: true,
    },
  });

  // stringify and write to file.
  const data = JSON.stringify(res, null, 2);
  fs.writeFileSync("featureDefs.json", data);
}

main().catch((error) => {
  console.log(error);
});

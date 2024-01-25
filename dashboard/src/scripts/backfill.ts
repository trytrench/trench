import data from "./data.json";
import { ulid } from "ulid";
import { getUnixTime } from "date-fns";
import { TrenchEvent } from "event-processing";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasourceUrl:
    "postgresql://postgres:postgres@localhost:5432/postgres?schema=public",
});
const allEvents = data as TrenchEvent[];

async function main() {
  await prisma.event.createMany({
    data: allEvents.map((event) => ({
      ...event,
      id: ulid(getUnixTime(new Date(event.timestamp))),
    })),
  });
}

main().catch((error) => {
  console.log(error);
});

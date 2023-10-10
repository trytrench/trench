import { prisma } from "databases";
import data from "./data.json";
import { type Event } from "sqrl-helpers/src";
import { ulid } from "ulid";
import { getUnixTime } from "date-fns";

const events = data as Event[];

async function main() {
  await prisma.eventLog.createMany({
    data: events.map((event) => ({
      ...event,
      id: ulid(getUnixTime(new Date(event.timestamp))),
    })),
  });
}

main().catch((error) => {
  console.log(error);
});

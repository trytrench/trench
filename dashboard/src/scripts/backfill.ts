import { prisma } from "databases";
import data from "./data.json";
import { type Event } from "sqrl-helpers/src";
import { ulid } from "ulid";
import { getUnixTime } from "date-fns";

const allEvents = data as Event[];
const events = allEvents.slice(0, 1000);

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

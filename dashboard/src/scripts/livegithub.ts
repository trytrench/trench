import { prisma } from "databases";
import { Octokit } from "octokit";
import { ulid } from "ulid";

const PAGE_LIMIT = 100;

let latestEvents: string[] = [];

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const EVENT_TYPES = [
  "CreateEvent",
  "DeleteEvent",
  "ForkEvent",
  "PullRequestReviewEvent",
  "IssuesEvent",

  "WatchEvent",
  "IssueCommentEvent",
  "PullRequestEvent",
];

async function fetchGithubEvents() {
  try {
    const { data: events } = await octokit.request("GET /events", {
      per_page: PAGE_LIMIT,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    const newEvents = events.filter(
      (event) => !latestEvents.includes(event.id)
    );

    await prisma.event.createMany({
      data: newEvents
        .filter((event) => event.type && EVENT_TYPES.includes(event.type))
        .map((event) => {
          if (!event.created_at || !event.type)
            throw new Error("No created_at or type in event");

          return {
            id: ulid(new Date(event.created_at).getTime()),
            timestamp: event.created_at,
            type: event.type,
            data: event,
          };
        }),
      skipDuplicates: true,
    });

    // console.log(newEvents.length, "new events");
    // if (newEvents.length === PAGE_LIMIT) {
    //   console.log("Missed events...");
    // }

    latestEvents = newEvents.map((event) => event.id);
  } catch (error) {
    console.error(error);
  }
}

async function main() {
  while (true) {
    await fetchGithubEvents();
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

main().catch(console.error);

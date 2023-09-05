import axios, { AxiosResponse } from "axios";
import { EventEmitter, Transform } from "stream";
import { createGunzip } from "zlib";
import ProgressBar from "progress";
import { pipeline } from "stream/promises";
import { format } from "date-fns";
import { batchUpsert, runEvent } from "~/lib/sqrlExecution";
import { createSqrlInstance } from "~/lib/createSqrlInstance";
import { prisma } from "~/server/db";
import { compileSqrl } from "~/lib/compileSqrl";
import { AsyncQueue } from "~/lib/Queue";

class GithubFirehose extends EventEmitter {
  async process(date: Date, hour: number): Promise<void> {
    try {
      let bar: ProgressBar | null = null;

      const response: AxiosResponse = await axios.get(
        `https://data.gharchive.org/${format(
          date,
          "yyyy-MM-dd"
        )}-${hour}.json.gz`,
        {
          responseType: "stream",
          onDownloadProgress(progressEvent) {
            if (progressEvent.total) {
              bar = new ProgressBar("-> downloading [:bar] :percent :etas", {
                complete: "=",
                incomplete: " ",
                width: 40,
                total: progressEvent.total,
              });

              bar.tick(progressEvent.loaded);
            }
          },
        }
      );

      let buffer = "";

      const jsonTransform = new Transform({
        transform(chunk, encoding, callback) {
          buffer += chunk.toString();

          let lineEndIndex;
          while ((lineEndIndex = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, lineEndIndex + 1);
            buffer = buffer.slice(lineEndIndex + 1);

            try {
              const obj = JSON.parse(line);
              this.push(obj);
            } catch (err) {
              // handle JSON parse error
              console.error("Error parsing JSON:", err);
            }
          }

          callback();
        },
        objectMode: true, // This allows us to push objects instead of string/buffer to the next stream
      });

      jsonTransform.on("data", (data) => {
        this.emit("event", data);
      });

      await pipeline(response.data, createGunzip(), jsonTransform);

      console.log("Pipeline succeeded.");
    } catch (error) {
      console.error("An error occurred:", error);
    }
  }
}

async function main() {
  const instance = await createSqrlInstance({
    config: {
      "state.allow-in-memory": true,
    },
    // config: {
    //   "redis.address": process.env.SQRL_REDIS,
    // },
  });

  const files = await prisma.file.findMany({
    include: {
      currentFileSnapshot: true,
    },
  });
  const fileData =
    files.reduce((acc, file) => {
      acc[file.name] = file.currentFileSnapshot.code;
      return acc;
    }, {} as Record<string, string>) || {};

  const { executable } = await compileSqrl(instance, fileData);

  const githubFirehose = new GithubFirehose();

  let results: Awaited<ReturnType<typeof runEvent>>[] = [];
  const BATCH_SIZE = 3000;
  const queue = new AsyncQueue();

  githubFirehose.on("event", (data) => {
    if (data.type === "WatchEvent") {
      const { created_at, type, ...rest } = data;
      const event = {
        type,
        timestamp: created_at,
        data: rest,
      };

      runEvent(event, executable)
        .then((eventData) => {
          results.push(eventData);

          if (results.length >= BATCH_SIZE) {
            queue.enqueue(() =>
              batchUpsert({
                events: results.flatMap((result) => result.events),
                entities: results.flatMap((result) => result.entities),
                entityLabelsToAdd: results.flatMap(
                  (result) => result.entityLabelsToAdd
                ),
                entityLabelsToRemove: results.flatMap(
                  (result) => result.entityLabelsToRemove
                ),
                eventLabels: results.flatMap((result) => result.eventLabels),
                entityToEventLinks: results.flatMap(
                  (result) => result.entityToEventLinks
                ),
              })
            );
            results = [];
          }
        })
        .catch((err) => {
          console.error("Error processing event:", err);
        });
    }
  });

  for (let hour = 0; hour < 24; hour++) {
    await githubFirehose.process(new Date("2023-01-05"), hour);
  }
}

main();

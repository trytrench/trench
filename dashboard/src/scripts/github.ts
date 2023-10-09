import axios, { AxiosResponse } from "axios";
import { prisma } from "databases";
import { eachDayOfInterval, format, getUnixTime } from "date-fns";
import ProgressBar from "progress";
import { EventEmitter, Transform } from "stream";
import { pipeline } from "stream/promises";
import { ulid } from "ulid";
import { createGunzip } from "zlib";

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
  const githubFirehose = new GithubFirehose();

  githubFirehose.on("event", (data) => {
    const { created_at, type, ...rest } = data;

    if (type === "WatchEvent")
      prisma.eventLog
        .create({
          data: {
            id: ulid(getUnixTime(new Date(created_at))),
            timestamp: created_at,
            type: type,
            data: rest as Prisma.JsonObject,
          },
        })
        .catch(console.error);
  });

  for (const date of eachDayOfInterval({
    start: new Date("2023-09-14"),
    end: new Date("2023-09-16"),
    // end: new Date("2023-09-20"),
  })) {
    for (let hour = 0; hour < 24; hour++) {
      await githubFirehose.process(date, hour);
    }
    console.log("Done with date:", date);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

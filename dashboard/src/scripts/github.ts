import axios, { AxiosResponse } from "axios";
import { Transform } from "stream";
import { createGunzip } from "zlib";
import ProgressBar from "progress";
import { pipeline } from "stream/promises";

async function fetchAndDecompress(hour: number): Promise<void> {
  try {
    let bar: ProgressBar | null = null;

    const response: AxiosResponse = await axios.get(
      `https://data.gharchive.org/2023-01-01-${hour}.json.gz`,
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

    if (bar) bar.terminate();

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

    let count = 0;
    jsonTransform.on("data", (data) => {
      if (data.type === "WatchEvent") {
        count++;
        // console.log("Received JSON object:", data);
      }
    });

    await pipeline(response.data, createGunzip(), jsonTransform);

    console.log("Pipeline succeeded.");
    console.log("Total WatchEvent count:", count);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

async function fetchDaysWorth() {
  for (let hour = 0; hour < 24; hour++) {
    await fetchAndDecompress(hour);
  }
}

fetchDaysWorth();

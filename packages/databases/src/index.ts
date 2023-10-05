import { PrismaClient } from "@prisma/client";
import { createClient } from "@clickhouse/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // log:
    //   env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    // log: env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

// prisma.$on("query", (e) => {
//   const query = e.query;
//   console.log();
//   console.log("Target: " + e.target);
//   console.log("Query: " + query);
//   console.log("Params: " + e.params);
//   console.log("Duration: " + e.duration + "ms");
// });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

type ParsedURI = {
  username: string;
  password: string;
  host: string;
  port: string;
  databaseName: string;
};

// function parseURI(uri: string): ParsedURI | null {
//   const regex = /^clickhouse:\/\/([^:]*):([^@]*)@([^:]+):(\d+)\/([^\/]+)$/;
//   const match = uri.match(regex);
//   if (match) {
//     return {
//       username: match[1]!,
//       password: match[2]!,
//       host: match[3]!,
//       port: match[4]!,
//       databaseName: match[5]!,
//     };
//   } else {
//     return null;
//   }
// }

// const parsedURI = parseURI(env.CLICKHOUSE_URL);

// if (!parsedURI) {
//   throw new Error("Invalid CLICKHOUSE_URL");
// }

export const db = createClient({
  host: env.CLICKHOUSE_URL,
});

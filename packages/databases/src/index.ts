import { PrismaClient } from "@prisma/client";
import { createClient } from "@clickhouse/client";
import { env } from "./env";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export { GlobalStateKey } from "@prisma/client";

export { createRedisService, type RedisInterface } from "./redis";

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

export const db = createClient({
  host: env.CLICKHOUSE_URL,
  password: env.CLICKHOUSE_PASSWORD,
});

export type ClickhouseClient = typeof db;

import { PrismaClient } from "@prisma/client";
import { env } from "~/env.mjs";
import "./lib/setup";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
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

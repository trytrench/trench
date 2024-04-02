import { createNextApiHandler } from "@trpc/server/adapters/next";
import { env } from "~/env.js";
import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";

const DEBUG = true;

// export API handler
export default createNextApiHandler({
  allowMethodOverride: true,
  router: appRouter,
  createContext: createTRPCContext,
  onError:
    env.NODE_ENV === "development"
      ? ({ path, error }) => {
          if (DEBUG) {
            console.error(error);
          } else {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
            );
          }
        }
      : undefined,
});

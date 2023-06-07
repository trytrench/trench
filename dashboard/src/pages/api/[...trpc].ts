import type { NextApiRequest, NextApiResponse } from "next";
import cors from "nextjs-cors";
import { createOpenApiNextHandler } from "trpc-openapi";

import { appRouter } from "~/server/api/root";
import { createTRPCContext } from "~/server/api/trpc";
import { env } from "~/env.mjs";
import * as Sentry from "@sentry/nextjs";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  // Setup CORS
  await cors(req, res);

  // Handle incoming OpenAPI requests
  return createOpenApiNextHandler({
    router: appRouter,
    createContext: createTRPCContext,
    onError: ({ path, error }) => {
      if (env.NODE_ENV === "development") {
        console.error(
          `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`
        );
      } else if (error.code === "INTERNAL_SERVER_ERROR") {
        Sentry.captureException(error);
      }
    },
  })(req, res);
};

export default handler;

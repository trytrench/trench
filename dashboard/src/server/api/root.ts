import { createTRPCRouter } from "~/server/api/trpc";
import { apiRouter } from "./routers/api";
import { sdkRouter } from "./routers/sdk";
import { dashboardRouter } from "./routers/dashboard";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  api: apiRouter,
  sdk: sdkRouter,
  dashboard: dashboardRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

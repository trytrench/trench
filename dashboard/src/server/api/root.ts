import { createTRPCRouter } from "~/server/api/trpc";
import { dashboardRouter } from "./routers/dashboard";
import { backtestsRouter } from "./routers/datasets";
import { entitiesRouter } from "./routers/entities";
import { eventsRouter } from "./routers/events";
import { featuresRouter } from "./routers/features";
import { labelsRouter } from "./routers/labels";
import { linksRouter } from "./routers/links";
import { listsRouter } from "./routers/lists";
import { projectRouter } from "./routers/project";
import { releasesRouter } from "./routers/release";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  events: eventsRouter,
  entities: entitiesRouter,
  labels: labelsRouter,
  backtests: backtestsRouter,
  lists: listsRouter,
  dashboard: dashboardRouter,
  features: featuresRouter,
  links: linksRouter,
  releases: releasesRouter,
  project: projectRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

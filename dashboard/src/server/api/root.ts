import { createTRPCRouter } from "~/server/api/trpc";
import { backtestsRouter } from "./routers/backtests";
import { dashboardRouter } from "./routers/dashboard";
import { datasetsRouter } from "./routers/datasets";
import { entitiesRouter } from "./routers/entities";
import { eventHandlersRouter } from "./routers/eventHandlers";
import { eventsRouter } from "./routers/events";
import { featureDefsRouter } from "./routers/featureDefs";
import { featuresRouter } from "./routers/features";
import { labelsRouter } from "./routers/labels";
import { linksRouter } from "./routers/links";
import { listsRouter } from "./routers/lists";
import { projectRouter } from "./routers/project";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  events: eventsRouter,
  entities: entitiesRouter,
  labels: labelsRouter,
  lists: listsRouter,
  dashboard: dashboardRouter,
  links: linksRouter,
  featureDefs: featureDefsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

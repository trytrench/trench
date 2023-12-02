import { createTRPCRouter } from "~/server/api/trpc";
import { dashboardRouter } from "./routers/dashboard";
import { datasetsRouter } from "./routers/datasets";
import { entitiesRouter } from "./routers/entities";
import { eventsRouter } from "./routers/events";
import { featuresRouter } from "./routers/features";
import { labelsRouter } from "./routers/labels";
import { linksRouter } from "./routers/links";
import { listsRouter } from "./routers/lists";
import { projectRouter } from "./routers/project";
import { eventHandlersRouter } from "./routers/eventHandlers";
import { backtestsRouter } from "./routers/backtests";
import { eventTypesRouter } from "./routers/eventTypes";
import { entityTypesRouter } from "./routers/entityTypes";
import { featureDefsRouter } from "./routers/featureDefs";
import { lists2Router } from "./routers/lists2";

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
  datasets: datasetsRouter,
  eventHandlers: eventHandlersRouter,
  features: featuresRouter,
  project: projectRouter,
  backtests: backtestsRouter,
  eventTypes: eventTypesRouter,
  entityTypes: entityTypesRouter,
  featureDefs: featureDefsRouter,
  lists2: lists2Router,
});

// export type definition of API
export type AppRouter = typeof appRouter;

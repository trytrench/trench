import { createTRPCRouter } from "~/server/api/trpc";
import { dashboardRouter } from "./routers/dashboard";
import { entitiesRouter } from "./routers/entities";
import { entityTypesRouter } from "./routers/entityTypes";
import { eventTypesRouter } from "./routers/eventTypes";
import { eventsRouter } from "./routers/events";
import { nodeDefsRouter } from "./routers/nodeDefs";
import { labelsRouter } from "./routers/labels";
import { linksRouter } from "./routers/links";
import { listsRouter } from "./routers/lists";
import { lists2Router } from "./routers/lists2";
import { featuresRouter } from "./routers/features";
import { rulesRouter } from "./routers/rules";
import { entityViewsRouter } from "./routers/entityViews";

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
  eventTypes: eventTypesRouter,
  entityTypes: entityTypesRouter,
  nodeDefs: nodeDefsRouter,
  lists2: lists2Router,
  features: featuresRouter,
  rules: rulesRouter,
  entityViews: entityViewsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

import { createTRPCRouter } from "~/server/api/trpc";
import { dashboardRouter } from "./routers/dashboard";
import { entitiesRouter } from "./routers/entities";
import { entityTypesRouter } from "./routers/entityTypes";
import { eventTypesRouter } from "./routers/eventTypes";
import { eventsRouter } from "./routers/events";
import { featureDefsRouter } from "./routers/featureDefs";
import { labelsRouter } from "./routers/labels";
import { linksRouter } from "./routers/links";
import { listsRouter } from "./routers/lists";
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
  eventTypes: eventTypesRouter,
  entityTypes: entityTypesRouter,
  featureDefs: featureDefsRouter,
  lists2: lists2Router,
});

// export type definition of API
export type AppRouter = typeof appRouter;

import { createTRPCRouter } from "~/server/api/trpc";
import { entityTypesRouter } from "./routers/entityTypes";
import { eventTypesRouter } from "./routers/eventTypes";
import { linksRouter } from "./routers/links";
import { listsRouter } from "./routers/lists";
import { featuresRouter } from "./routers/features";
import { rulesRouter } from "./routers/rules";
import { entityViewsRouter } from "./routers/entityViews";
import { decisionsRouter } from "./routers/decisions";
import { editorRouter } from "./routers/editor";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  lists: listsRouter,
  links: linksRouter,
  eventTypes: eventTypesRouter,
  entityTypes: entityTypesRouter,
  features: featuresRouter,
  rules: rulesRouter,
  entityViews: entityViewsRouter,
  decisions: decisionsRouter,
  editor: editorRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

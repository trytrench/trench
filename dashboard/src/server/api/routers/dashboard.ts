import { createTRPCRouter } from "../trpc";
import { rulesRouter } from "./dashboard/rules";
import { listsRouter } from "./dashboard/lists";
import { usersRouter } from "./dashboard/users";
import { evaluableActionsRouter } from "./dashboard/evaluableActions";

export const dashboardRouter = createTRPCRouter({
  rules: rulesRouter,
  evaluableActions: evaluableActionsRouter,
  lists: listsRouter,
  users: usersRouter,
});

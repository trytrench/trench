import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { rulesRouter } from "./dashboard/rules";
import { paymentAttemptsRouter } from "./dashboard/paymentAttempts";
import { listsRouter } from "./dashboard/lists";
import { customersRouter } from "./dashboard/customers";
import path from "path";
import fs from "fs";

export const dashboardRouter = createTRPCRouter({
  rules: rulesRouter,
  paymentAttempts: paymentAttemptsRouter,
  lists: listsRouter,
  customers: customersRouter,
});

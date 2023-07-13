import { createTRPCRouter } from "../trpc";
import { apiKycRouter } from "./api/kyc";
import { apiPaymentsRouter } from "./api/payments";

export const apiRouter = createTRPCRouter({
  payments: apiPaymentsRouter,
  kyc: apiKycRouter,
});

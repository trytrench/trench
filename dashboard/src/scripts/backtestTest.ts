import { addDays } from "date-fns";
import { backTest } from "~/lib/sqrlBacktest";

// backtest past 30 days
const end = addDays(new Date(), -30);
const start = addDays(end, -120);

backTest(start, end).catch(console.error);

import { z } from "zod";

export const timeWindowSchema = z.object({
  value: z.number(),
  unit: z.enum(["minutes", "hours", "days", "weeks", "months"]),
});

export type TimeWindow = z.infer<typeof timeWindowSchema>;

export function getTimeWindowMs(timeWindow: TimeWindow) {
  const { value, unit } = timeWindow;
  const ms = value * 1000 * 60 * 60;
  switch (unit) {
    case "minutes":
      return ms / 60;
    case "hours":
      return ms;
    case "days":
      return ms * 24;
    case "weeks":
      return ms * 24 * 7;
    case "months":
      return ms * 24 * 30;
  }
}

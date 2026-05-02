import { subDays, subMonths } from "date-fns";
import type { TimeRange } from "./constants";

export function getTimeRangeStart(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case "30d":
      return subDays(now, 30);
    case "90d":
      return subDays(now, 90);
    case "6m":
      return subMonths(now, 6);
    case "all":
      return null;
  }
}

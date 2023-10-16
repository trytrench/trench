import { Context, SqrlKey } from "sqrl";
import { LabelService } from "./LabelFunctions";
import { RateLimitService } from "./RateLimitFunctions";
import { UniqueIdService } from "./services/RedisUniqueId";

export interface CountService {
  fetch(
    ctx: Context,
    at: number,
    keys: SqrlKey[],
    windowMs: number | null
  ): Promise<number[]>;
  bump(
    ctx: Context,
    at: number,
    keys: SqrlKey[],
    windowMs: number | null,
    by: number
  ): Promise<void>;
}

export interface CountUniqueService {
  bump(
    ctx: Context,
    props: {
      at: number;
      key: SqrlKey;
      sortedHashes: string[];
      windowMs: number;
    }
  ): void;
  fetchHashes(
    ctx: Context,
    props: { keys: SqrlKey[]; windowStartMs: number }
  ): Promise<string[]>;
  fetchCounts(
    ctx: Context,
    props: {
      keys: SqrlKey[];
      at: number;
      windowMs: number;
      addHashes: string[];
    }
  ): Promise<number[]>;
}

export interface Services {
  count: CountService;
  countUnique: CountUniqueService;
  label: LabelService;
  rateLimit: RateLimitService;
  uniqueId: UniqueIdService;
}

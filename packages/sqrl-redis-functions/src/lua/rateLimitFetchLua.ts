/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { MockRedisDatabase } from "../mocks/MockRedisDatabase";

export function rateLimitFetchLua() {
  // It is likely inefficient to update the expiry time on every ratelimit,
  // change, that could be optimized a lot.

  return (
    `
local maxAmount = tonumber(ARGV[1])
local take = tonumber(ARGV[2])
local at = tonumber(ARGV[3])
local refillTime = tonumber(ARGV[4])
local refillAmount = tonumber(ARGV[5])
local strict = tonumber(ARGV[6]) > 0


local current = redis.call("get", KEYS[1]);
local tokens
local lastRefill

if not current then
  tokens = maxAmount
  lastRefill = at
else
  tokens, lastRefill = struct.unpack("i8i8", current)

  if lastRefill > at then
    at = lastRefill
  end
end

if take == 0 then
  return tokens
end

if tokens < take then
  local refills = math.floor((at - lastRefill) / refillTime);
  lastRefill = lastRefill + refills * refillTime
  tokens = math.min(maxAmount, tokens + refills * refillAmount)
end

local beforeTake = tokens

if tokens == 0 then
  if strict then
    lastRefill = at
  else
    return 0
  end
else
  tokens = math.max(0, tokens - take)
end

local expiry = math.ceil((maxAmount - tokens) / refillAmount) * refillTime

local value = struct.pack("i8i8", tokens, lastRefill)
redis.call("set", KEYS[1], value, "px", expiry)

return beforeTake
  `.trim() + "\n"
  );
}

/**
 * An exact replica of the lua function but running on a mock in memory database
 * for testing.
 */
export function mockRateLimitFetch(
  redis: MockRedisDatabase,
  key: string,
  maxAmount: number,
  take: number,
  at: number,
  refillTime: number,
  refillAmount: number,
  strict: boolean
) {
  const current = redis.db[key];
  let tokens: number;
  let lastRefill: number;

  if (!current) {
    tokens = maxAmount;
    lastRefill = at;
  } else {
    [tokens, lastRefill] = JSON.parse(current);
    if (lastRefill > at) {
      at = lastRefill;
    }
  }

  if (take === 0) {
    return tokens;
  }

  if (tokens < take) {
    const refills = Math.floor((at - lastRefill) / refillTime);
    lastRefill = lastRefill + refills * refillTime;
    tokens = Math.min(maxAmount, tokens + refills * refillAmount);
  }

  const beforeTake = tokens;

  if (tokens === 0) {
    if (strict) {
      lastRefill = at;
    } else {
      return 0;
    }
  } else {
    tokens = Math.max(0, tokens - take);
  }

  // @todo: No expiry in mock
  // const expiry = Math.ceil((maxAmount - tokens) / refillAmount) * refillTime

  const value = JSON.stringify([tokens, lastRefill]);
  redis.db[key] = value;

  return beforeTake;
}

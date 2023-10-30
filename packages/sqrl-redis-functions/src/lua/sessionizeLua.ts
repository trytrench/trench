/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { MockRedisDatabase } from "../mocks/MockRedisDatabase";

export function sessionizeLua() {
  // It is likely inefficient to update the expiry time on every ratelimit,
  // change, that could be optimized a lot.
  return (
    `
local maxAmount = tonumber(ARGV[1])
local take = tonumber(ARGV[2])
local at = tonumber(ARGV[3])
local refillTime = tonumber(ARGV[4])
local refillAmount = tonumber(ARGV[5])


local current = redis.call("get", KEYS[1]);
local tokens
local lastRefill
local sessionStart

if not current then
  tokens = maxAmount
  lastRefill = at
else
  sessionStart, tokens, lastRefill = struct.unpack("i8i8i8", current)
end

if take == 0 then
  return redis.error_reply("Take must be non-zero for sessionize()")
end

if tokens < take then
  local refills = math.floor((at - lastRefill) / refillTime);
  lastRefill = lastRefill + refills * refillTime
  tokens = math.min(maxAmount, tokens + refills * refillAmount)
end

if tokens >= take then
  sessionStart = at
end

local returnedSession = nil
if tokens == 0 then
  lastRefill = at
  returnedSession = sessionStart
else
  tokens = math.max(0, tokens - take)
end

local expiry = math.ceil((maxAmount - tokens) / refillAmount) * refillTime

local value = struct.pack("i8i8i8", sessionStart, tokens, lastRefill)
redis.call("set", KEYS[1], value, "px", expiry)
  
return returnedSession
  `.trim() + "\n"
  );
}

/**
 * An exact replica of the lua function but running on a mock in memory database
 * for testing.
 */
export function mockSessionize(
  redis: MockRedisDatabase,
  key: string,
  maxAmount: number,
  take: number,
  at: number,
  refillTime: number,
  refillAmount: number
) {
  const current = redis.db[key];
  let tokens;
  let lastRefill;
  let sessionStart;

  if (!current) {
    tokens = maxAmount;
    lastRefill = at;
  } else {
    [sessionStart, tokens, lastRefill] = JSON.parse(current);
  }

  if (take === 0) {
    throw new Error("Take must be non-zero for sessionize()");
  }

  if (tokens < take) {
    const refills = Math.floor((at - lastRefill) / refillTime);
    lastRefill = lastRefill + refills * refillTime;
    tokens = Math.min(maxAmount, tokens + refills * refillAmount);
  }

  if (tokens >= take) {
    sessionStart = at;
  }

  let returnedSession = null;
  if (tokens === 0) {
    lastRefill = at;
    returnedSession = sessionStart;
  } else {
    tokens = Math.max(0, tokens - take);
  }

  // @todo: expiry
  // let expiry = math.ceil((maxAmount - tokens) / refillAmount) * refillTime;

  const value = JSON.stringify([sessionStart, tokens, lastRefill]);
  redis.db[key] = value;

  return returnedSession;
}

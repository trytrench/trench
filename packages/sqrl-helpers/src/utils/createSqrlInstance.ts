import { AT, createInstance, type Execution } from "sqrl";
import * as sqrlJsonPath from "sqrl-jsonpath";
import * as sqrlLoadFunctions from "sqrl-load-functions";
import * as sqrlRedisFunctions from "sqrl-redis-functions";
import { type RedisInterface } from "sqrl-redis-functions/lib/services/RedisInterface";
import { MockRedisService } from "sqrl-redis-functions/lib/mocks/MockRedisService";
import * as sqrlTextFunctions from "sqrl-text-functions";
import { fetchUserData } from "./fetchGithubData";
import pLimit from "p-limit";
import { AxiosError } from "axios";

let RedisService;

if (typeof window === "undefined") {
  RedisService =
    require("sqrl-redis-functions/lib/services/RedisService").RedisService;
}

export async function createSqrlInstance(
  options?: Parameters<typeof createInstance>[0]
) {
  const instance = createInstance(options);

  let redisService: RedisInterface;
  if (options?.config?.["redis.address"]) {
    const redis = new RedisService(options.config["redis.address"]);
    redisService = redis;
  } else if (options?.config?.["state.allow-in-memory"]) {
    redisService = new MockRedisService();
  } else {
    throw new Error(
      "No `redis.address` was configured and`state.allow-in-memory` is false."
    );
  }

  await instance.importFromPackage("sqrl-jsonpath", sqrlJsonPath);
  await instance.importFromPackage("sqrl-redis-functions", sqrlRedisFunctions);
  await instance.importFromPackage("sqrl-text-functions", sqrlTextFunctions);
  await instance.importFromPackage("sqrl-load-functions", sqrlLoadFunctions);

  instance.registerStatement(
    "SqrlLogStatements",
    async function consoleLog(state: Execution, format: string, ...args) {
      console.log(format, ...args);
    },
    {
      allowNull: true,
      args: [AT.state, AT.any.repeated],
      argstring: "format string, value...",
      docstring: "Logs a message using console.log()",
    }
  );

  instance.registerStatement(
    "SqrlRedisStatements",
    async function set(state: Execution, key: string, value: string) {
      return redisService.set(state.ctx, Buffer.from(key), value);
    },
    {
      args: [AT.state, AT.any.string, AT.any.string],
    }
  );

  instance.registerStatement(
    "SqrlRedisStatements",
    async function get(state: Execution, key: string) {
      return redisService.get(state.ctx, Buffer.from(key));
    },
    {
      args: [AT.state, AT.any.string],
    }
  );

  const limit = pLimit(10);

  instance.register(
    async function getUserData(state: Execution, username: string) {
      const cached = await redisService.get(
        state.ctx,
        Buffer.from(`user:${username}`)
      );
      if (cached) {
        return JSON.parse(cached.toString()) as ReturnType<
          typeof fetchUserData
        >;
      }

      try {
        const userData = await limit(() => fetchUserData(username));
        console.log("Fetched user data:", username);

        await redisService.set(
          state.ctx,
          Buffer.from(`user:${username}`),
          JSON.stringify(userData)
        );
        return userData;
      } catch (error) {
        if (error instanceof AxiosError) {
          console.error("Error fetching user data:", error.message);
          console.log(username);
        }
        console.log(error);
        return null;
      }
    },
    {
      args: [AT.state, AT.any.string],
    }
  );

  return instance;
}

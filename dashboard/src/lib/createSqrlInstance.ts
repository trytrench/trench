import {
  AT,
  createInstance,
  type Execution,
  type SqrlEntity,
  type WhenCause,
} from "sqrl";
import * as sqrlJsonPath from "sqrl-jsonpath";
import * as sqrlLoadFunctions from "sqrl-load-functions";
import * as sqrlRedisFunctions from "sqrl-redis-functions";
import { type RedisInterface } from "sqrl-redis-functions/lib/Services/RedisInterface";
import { MockRedisService } from "sqrl-redis-functions/lib/mocks/MockRedisService";
import * as sqrlTextFunctions from "sqrl-text-functions";
import { SqrlManipulator } from "./SqrlManipulator";

let RedisService;

if (typeof window === "undefined") {
  RedisService =
    require("sqrl-redis-functions/lib/Services/RedisService").RedisService;
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
    "SqrlBlockStatements",
    async function addEventLabel(
      state: Execution,
      cause: WhenCause,
      type: string,
      label: string
    ) {
      if (!(state.manipulator instanceof SqrlManipulator)) {
        throw new Error(
          "Expected manipulator to be an instance of SqrlManipulator"
        );
      }
      state.manipulator.addEventLabel(type, label, cause);
    },
    {
      args: [AT.state, AT.whenCause, AT.any.string, AT.any.string],
      allowNull: true,
      argstring: "",
      docstring: "Add a label to the current action",
    }
  );

  instance.registerStatement(
    "SqrlBlockStatements",
    async function addEventFeature(
      state: Execution,
      name: string,
      value: string
    ) {
      if (!(state.manipulator instanceof SqrlManipulator)) {
        throw new Error(
          "Expected manipulator to be an instance of SqrlManipulator"
        );
      }
      state.manipulator.addEventFeature(name, value);
    },
    {
      args: [AT.state, AT.any.string, AT.any],
      argstring: "",
      docstring: "Add a feature to the current event",
    }
  );

  instance.registerStatement(
    "SqrlBlockStatements",
    async function addEntityFeature(
      state: Execution,
      entity: SqrlEntity,
      name: string,
      value: string
    ) {
      if (!(state.manipulator instanceof SqrlManipulator)) {
        throw new Error(
          "Expected manipulator to be an instance of SqrlManipulator"
        );
      }
      state.manipulator.addEntityFeature(entity, name, value);
    },
    {
      args: [AT.state, AT.any, AT.any.string, AT.any],
      allowSqrlObjects: true,
      argstring: "",
      docstring: "Add a feature to the entity",
    }
  );

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

  return instance;
}

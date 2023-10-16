/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  runSqrlTest as runLibSqrl,
  buildTestInstance,
  Instance,
  Logger,
} from "sqrl";
import { register } from "../../src";

export async function buildRedisTestInstance(
  options: {
    fixedDate?: string;
  } = {}
) {
  const instance = await buildTestInstance({
    config: {
      "testing.fixed-date": options.fixedDate,
    },
  });
  register(instance);
  return instance;
}

export async function runSqrl(
  sqrl: string,
  options: {
    instance?: Instance;
    logger?: Logger;
    fixedDate?: string;
  } = {}
) {
  return runLibSqrl(sqrl, {
    instance:
      options.instance ||
      (await buildRedisTestInstance({
        fixedDate: options.fixedDate,
      })),
    logger: options.logger,
  });
}

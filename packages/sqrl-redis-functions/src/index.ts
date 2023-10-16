/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { registerCountFunctions } from "./CountFunctions";
import { registerCountUniqueFunctions } from "./CountUniqueFunctions";
import { registerRateLimitFunctions } from "./RateLimitFunctions";
import { registerLabelFunctions } from "./LabelFunctions";
import { RedisServices } from "./ServiceHelpers";
import { Instance } from "sqrl";
import { registerEntityFunctions } from "./EntityFunctions";

export function register(instance: Instance) {
  const services = new RedisServices(instance.getConfig());

  registerCountFunctions(instance, services.count);
  registerCountUniqueFunctions(instance, services.countUnique);
  registerEntityFunctions(instance, services.uniqueId);
  registerLabelFunctions(instance, services.label);
  registerRateLimitFunctions(instance, services.rateLimit);
}

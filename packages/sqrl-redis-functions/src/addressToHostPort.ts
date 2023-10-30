import { invariant } from "sqrl-common";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

export function addressToHostPort(
  address: string,
  defaultPort: number
): [string, number] {
  const split = address.split(":");
  if (split.length === 1) {
    return [split[0], defaultPort];
  } else if (split.length === 2) {
    const port = parseInt(split[1], 10);
    invariant(
      port > 0 && "" + port === split[1],
      "Invalid address: %s",
      address
    );
    return [split[0], port];
  } else {
    throw new Error("Invalid address: " + address);
  }
}

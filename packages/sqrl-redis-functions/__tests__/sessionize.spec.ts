/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { runSqrl, buildRedisTestInstance } from "./helpers/runSqrl";
import { Instance } from "sqrl";
import { jsonTemplate } from "sqrl-common";

let instance: Instance;
beforeEach(async () => {
  instance = await buildRedisTestInstance();
});

test("basic test works", async () => {
  await runSqrl(
    jsonTemplate`
    LET StartClock := ${new Date().toISOString()}; 

    LET SqrlClock := StartClock;
    LET Ip := "1.2.3.4";
    LET Session := sessionize(BY Ip MAX 2 EVERY 10 SECONDS);
    LET SessionAge := dateDiff("MS", Session);

    ASSERT Session = null;
    EXECUTE;
    ASSERT Session = null;
    EXECUTE;
    ASSERT Session != null;
    ASSERT SessionAge = 0;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "PT5S");
    ASSERT Session != null;
    ASSERT SessionAge = 5000;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "PT6S");
    ASSERT Session != null;
    ASSERT SessionAge = 6000;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "PT15S");
    ASSERT Session != null;
    ASSERT SessionAge = 15000;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "PT25S");
    ASSERT Session = null;
    ASSERT SessionAge = null;
    EXECUTE;
    `,
    { instance }
  );
});

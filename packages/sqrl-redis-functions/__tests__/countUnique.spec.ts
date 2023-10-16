/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { createSimpleContext, Execution, SimpleManipulator } from "sqrl";
import * as moment from "moment";
import { jsonTemplate } from "sqrl-common";
import { runSqrl, buildRedisTestInstance } from "./helpers/runSqrl";

test("clears as expected", async () =>
  runSqrl(jsonTemplate`
LET SqrlClock := ${moment().toISOString()};
LET Ip := entity("Ip", "1.2.3.4");
LET SessionActor := null;
LET UniquesByIp := countUnique(SessionActor GROUP BY Ip LAST HOUR);
LET UniquesByIpTotal := countUnique(SessionActor BY Ip);

# Test a unique by josh (without executing)
LET SessionActor := entity("Object", "user/josh");
ASSERT UniquesByIp = 1;

# Another unique by greg (without executing) should still be one
LET SessionActor := entity("Object", "user/greg");
ASSERT UniquesByIp = 1;
EXECUTE;

# After execution greg reads 1
LET SessionActor := entity("Object", "user/greg");
ASSERT UniquesByIp = 1;

# But a hit from josh reads 2
LET SessionActor := entity("Object", "user/josh");
ASSERT UniquesByIp = 2; # josh 2
EXECUTE;

LET SessionActor := entity("Object", "user/tim");
ASSERT UniquesByIp = 3; # ... and tim=3
EXECUTE;

# If we fast-forward the clock thirty minutes it's still good
LET SqrlClock := ${moment().add(30, "minute").toISOString()};
ASSERT UniquesByIp = 3;

LET SqrlClock := ${moment().add(70, "minute").toISOString()};
ASSERT UniquesByIp = 1; # ...but in an hour the result is just tim
ASSERT UniquesByIpTotal = 3; # total is still 3
`));

/*
test("intersects uniques", async () =>
  runSqrlTest(`
LET IpA := entity("Ip", "1.2.3.4");
LET IpB := entity("Ip", "1.2.3.5");
LET IpC := entity("Ip", "1.2.3.6");
LET IpD := entity("Ip", "1.2.3.7");
LET UserA := entity("Object", "user/josh");
LET UserB := entity("Object", "user/greg");
LET UserC := entity("Object", "user/tim");
LET Ip := null;
LET User := null;

LET UniquesByEither := countUnique(
  Ip
  GROUP BY UserA as User
  UNION UserB as User
  LAST HOUR
);
LET UniquesByBoth := countUnique(
  Ip
  GROUP BY UserA as User
  INTERSECT UserB as User
  LAST HOUR
);


# UserA uses Ip A & B
LET Ip := IpA; LET User := UserA; EXECUTE;
LET Ip := IpB; LET User := UserA; EXECUTE;

ASSERT UniquesByEither = 2; # UserA=[A&B] UserB=[]
ASSERT UniquesByBoth = 0; # UserA=[A&B] UserB=[]

# UserB uses Ip B & C
LET Ip := IpB; LET User := UserB; EXECUTE;
LET Ip := IpC; LET User := UserB; EXECUTE;

# User C uses IP C
LET Ip := IpC; LET User := UserC; EXECUTE;

ASSERT UniquesByEither = 3; # UserA=[A&B] UserB=[B&C]
ASSERT UniquesByBoth = 1; # UserA=[A&B] UserB=[B&C]

LET UniquesByEither := countUnique(
  Ip
  GROUP BY UserB as User
  UNION UserC as User
  LAST HOUR
);
LET UniquesByBoth := countUnique(
  Ip
  GROUP BY UserB as User
  INTERSECT UserC as User
  LAST HOUR
);

ASSERT UniquesByEither = 2; # UserB=[B&C] UserC=[C]
ASSERT UniquesByBoth = 1; # UserB=[B&C] UserC=[C]

LET Ip := IpD;
ASSERT UniquesByEither = 3; # IpD is new
ASSERT UniquesByBoth = 1;
`));

*/

test("unique aliases dont bump aliased", async () =>
  runSqrl(`
LET Ip := entity("Ip", "1.2.3.4");
LET Actor := null;
LET Target := null;
LET UniquesIpByActorAsTarget := countUnique(Ip GROUP BY Actor AS Target LAST WEEK);

LET Actor := entity("Object", "user/josh");
LET Target := entity("Object", "user/greg");

# Unique ip's when greg was the target is now 1
EXECUTE;

# Unique ip's when greg was the target is now 2
LET Ip := entity("Ip", "1.2.3.5");
EXECUTE;

# Unique ip's when greg was the target is now 3
LET Ip := entity("Ip", "1.2.3.6");
EXECUTE;

# With josh as the target is still 0
ASSERT UniquesIpByActorAsTarget = 0;

LET Actor := entity("Object", "user/greg");
LET Target := entity("Object", "user/josh");
ASSERT UniquesIpByActorAsTarget = 3;

LET Ip := entity("Ip", "1.2.3.5");
ASSERT UniquesIpByActorAsTarget = 3;

LET Ip := entity("Ip", "1.2.3.7");
ASSERT UniquesIpByActorAsTarget = 3;

LET Target := entity("Object", "user/greg");
ASSERT UniquesIpByActorAsTarget = 4;
`));

test("unique aliases work", async () => {
  let state: Execution;
  let manipulator: SimpleManipulator;

  const instance = await buildRedisTestInstance({
    fixedDate: "2016-09-26T20:56:14.538Z",
  });
  const run = async (
    countStatement?: string,
    values: any = {}
  ): Promise<{ state: Execution; manipulator: SimpleManipulator }> => {
    const rv = await runSqrl(
      `
LET SessionActor := ${JSON.stringify(values.SessionActor || "OriginalActor")};
LET Ip := ${JSON.stringify(values.Ip || "1.2.3.4")};
LET Target := ${JSON.stringify(values.Target || "greg")};
LET UniquesByIp := countUnique(${countStatement} GROUP BY Ip LAST WEEK);
    `,
      { instance }
    );

    const state = rv.executions.shift();
    await state.fetchValue("SqrlExecutionComplete");
    return {
      state,
      manipulator: rv.lastManipulator,
    };
  };
  const ctx = createSimpleContext();

  ({ state, manipulator } = await run("SessionActor"));
  expect(await state.fetchValue("UniquesByIp")).toEqual(1);
  await manipulator.mutate(ctx);
  ({ state, manipulator } = await run("SessionActor", {
    SessionActor: "Actor2",
  }));
  expect(await state.fetchValue("UniquesByIp")).toEqual(2);
  await manipulator.mutate(ctx);

  // Get the count as if the Target was the Actor we saw before. Not a new unique value.
  ({ state, manipulator } = await run("Target AS SessionActor", {
    Target: "OriginalActor",
    SessionActor: "Actor3",
  }));
  expect(await state.fetchValue("UniquesByIp")).toEqual(2);
  await manipulator.mutate(ctx);

  // Fetch for Target as SessionActor but as a new value.
  ({ state, manipulator } = await run("Target AS SessionActor", {
    Target: "Actor3",
    SessionActor: "Winnie",
  }));
  expect(await state.fetchValue("UniquesByIp")).toEqual(3);
  await manipulator.mutate(ctx);

  expect(Array.from(manipulator.sqrlKeys)).toEqual([
    'counter=3fab817c;timeMs=2016-09-26T20:56:14.538Z;features=["1.2.3.4"]',
  ]);
});

test("arbitrary counts work", async () => {
  await runSqrl(jsonTemplate`
    LET StartClock := '2019-01-17T20:59:28.874Z';
    LET SqrlClock := StartClock;
    LET SqrlIsClassify := false;
    LET Actor := 'josh';

    LET Count10Min := countUnique(Actor LAST 10 MINUTES);
    LET Count30Min := countUnique(Actor LAST 30 MINUTES);
    LET Count45Min := countUnique(Actor LAST 45 MINUTES);
    LET Count12Day := countUnique(Actor LAST 12 DAYS);

    # Bump the counter by a different actor every minute for 5 minutes
    LET Actor := 'a';
    LET SqrlClock := dateAdd(StartClock, "PT0M");
    EXECUTE;
    LET Actor := 'b';
    LET SqrlClock := dateAdd(StartClock, "PT1M");
    EXECUTE;
    LET Actor := 'c';
    LET SqrlClock := dateAdd(StartClock, "PT2M");
    EXECUTE;
    LET Actor := 'd';
    LET SqrlClock := dateAdd(StartClock, "PT3M");
    EXECUTE;
    LET Actor := 'e';
    LET SqrlClock := dateAdd(StartClock, "PT4M");
    EXECUTE;

    ASSERT Count10Min = 5;
    ASSERT Count12Day = 5;

    LET SqrlClock := dateAdd(StartClock, "PT5M");
    ASSERT Count10Min = 5;
    ASSERT Count12Day = 5;

    LET SqrlClock := dateAdd(StartClock, "PT9M");
    ASSERT Count10Min = 5;
    ASSERT Count30Min = 5;

    LET SqrlClock := dateAdd(StartClock, "PT10M");
    ASSERT Count10Min = 5;
    ASSERT Count30Min = 5;

    LET SqrlClock := dateAdd(StartClock, "PT11M");
    ASSERT Count10Min = 4;
    ASSERT Count30Min = 5;

    LET SqrlClock := dateAdd(StartClock, "PT12M");
    ASSERT Count10Min = 3;
    ASSERT Count30Min = 5;

    LET SqrlClock := dateAdd(StartClock, "PT13M");
    ASSERT Count10Min = 2;
    ASSERT Count30Min = 5;

    LET SqrlClock := dateAdd(StartClock, "PT14M");
    ASSERT Count10Min = 1;
    ASSERT Count30Min = 5;

    LET SqrlClock := dateAdd(StartClock, "PT15M");
    ASSERT Count10Min = 0;
    ASSERT Count30Min = 5;

    LET SqrlClock := dateAdd(StartClock, "PT35M");
    ASSERT Count10Min = 0;
    ASSERT Count30Min = 1;

    LET SqrlClock := dateAdd(StartClock, "PT40M");
    ASSERT Count30Min = 0;
    ASSERT Count45Min = 5;

    LET SqrlClock := dateAdd(StartClock, "P3D");
    ASSERT Count10Min = 0;
    ASSERT Count30Min = 0;
    ASSERT Count45Min = 0;
    ASSERT Count12Day = 5;

    LET SqrlClock := dateAdd(StartClock, "P13D");
    ASSERT Count10Min = 0;
    ASSERT Count30Min = 0;
    ASSERT Count45Min = 0;
    ASSERT Count12Day = 0;
  `);
});

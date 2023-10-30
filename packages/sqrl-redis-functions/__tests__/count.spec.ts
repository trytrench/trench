/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { range, jsonTemplate } from "sqrl-common";
import { runSqrl } from "./helpers/runSqrl";

test("multi aliases work", async () => {
  const { lastManipulator } = await runSqrl(
    `
    LET SqrlIsClassify := true;
    LET SessionActor := entity("User", "josh");
    LET Target := entity("User", "julian");
    LET ActionName := "report";

    LET NumTimesReported := count(BY SessionActor AS Target WHERE ActionName = "report" LAST WEEK);
    LET NumReportsForTarget := count(BY Target WHERE ActionName = "report" LAST WEEK);

    # See how many times Julian as the target has been reported
    ASSERT NumReportsForTarget = 1;
    # See how many times Josh as the target has been reported
    ASSERT NumTimesReported = 0;

    # Josh reports Julian 3 times
    EXECUTE;
    EXECUTE;
    EXECUTE;

    # Flip Actor and julian
    LET SessionActor := entity("User", "julian");
    LET Target := entity("User", "josh");

    # Now that Julian is reporting Josh they should both have one report

    ASSERT NumReportsForTarget = 1;
    ASSERT NumTimesReported = 3;

    EXECUTE;

    # Where condition being false means we don't bump but can still read out the values
    LET ActionName := "random";
    ASSERT NumReportsForTarget = 1;
    ASSERT NumTimesReported = 3;
  `,
    { fixedDate: "2019-01-17T20:51:27.017Z" }
  );

  expect(Array.from(lastManipulator.sqrlKeys).sort()).toEqual([
    'counter=054c84dc;timeMs=2019-01-17T20:51:27.017Z;features=["josh"]',
    'counter=054c84dc;timeMs=2019-01-17T20:51:27.017Z;features=["julian"]',
  ]);
});

test("trending works ", async () => {
  const counterHash = {
    "WHERE SomeCondition": "741a4d97",
    "": "a7274005",
  };
  for (const where of ["WHERE SomeCondition", ""]) {
    const { lastManipulator } = await runSqrl(
      `
LET SqrlIsClassify := true;
LET SomeCondition := true;

LET UserGeneratedTextTriGrams := [
  entity("TriGrams", "a trending trigram"),
];

# One bump from standard count to show they use same keys
LET TrendingTriGramsDayOverDay := count(BY UserGeneratedTextTriGrams ${where} DAY OVER DAY);
EXECUTE;

LET TrendingTriGramsDayOverDay := trending(UserGeneratedTextTriGrams ${where} DAY OVER DAY);
# 0 -> 10 is enough to trigger a trending hit.
${range(9)
  .map(() => "EXECUTE;")
  .join("\n")}
ASSERT TrendingTriGramsDayOverDay = [
  {
    "key": [
      "a trending trigram"
    ],
    "current": 10,
    "delta": 10,
    "previous": 0,
    "magnitude": 1
  }
];

LET TrendingTriGramsDayOverDay := trending(
  UserGeneratedTextTriGrams ${where} WITH MIN 11 EVENTS DAY OVER DAY
);
ASSERT TrendingTriGramsDayOverDay = [];
`,
      { fixedDate: "2019-01-17T20:51:27.017Z" }
    );

    expect(Array.from(lastManipulator.sqrlKeys)).toEqual([
      `counter=${counterHash[where]};timeMs=2019-01-17T20:51:27.017Z;features=["a trending trigram"]`,
    ]);
  }
});

test("decaying works", async () => {
  await runSqrl(jsonTemplate`
    LET StartClock := '2019-01-17T20:59:28.874Z';

    LET SqrlClock := StartClock;
    LET Actor := 'josh';

    LET CountDay := count(BY Actor LAST DAY);
    LET CountWeek := count(BY Actor LAST WEEK);
    LET CountMonth := count(BY Actor LAST MONTH);
    LET CountTotal := count(BY Actor TOTAL);

    ASSERT CountDay = 1;
    ASSERT CountWeek = 1;
    ASSERT CountMonth = 1;
    ASSERT CountTotal = 1;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "PT1H");
    ASSERT CountDay = 2;
    ASSERT CountWeek = 2;
    ASSERT CountMonth = 2;
    ASSERT CountTotal = 2;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "PT30H");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 3;
    ASSERT CountMonth = 3;
    ASSERT CountTotal = 3;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "P2D");
    ASSERT CountDay = 2;
    ASSERT CountWeek = 4;
    ASSERT CountMonth = 4;
    ASSERT CountTotal = 4;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "P10D");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 1;
    ASSERT CountMonth = 5;
    ASSERT CountTotal = 5;
    EXECUTE;
    
    LET SqrlClock := dateAdd(StartClock, "P30D");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 1;
    ASSERT CountMonth = 5;
    ASSERT CountTotal = 6;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "P35D");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 2;
    ASSERT CountMonth = 3;
    ASSERT CountTotal = 7;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "P90D");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 1;
    ASSERT CountMonth = 1;
    ASSERT CountTotal = 8;
    EXECUTE;

    LET SqrlClock := dateAdd(StartClock, "P4Y");
    ASSERT CountDay = 1;
    ASSERT CountWeek = 1;
    ASSERT CountMonth = 1;
    ASSERT CountTotal = 9;
    EXECUTE;
  `);
});

test("arbitrary counts work", async () => {
  await runSqrl(jsonTemplate`
    LET StartClock := '2019-01-17T20:59:28.874Z';
    LET SqrlClock := StartClock;
    LET SqrlIsClassify := false;
    LET Actor := 'josh';

    LET Count10Min := count(BY Actor LAST 10 MINUTES);
    LET Count30Min := count(BY Actor LAST 30 MINUTES);
    LET Count45Min := count(BY Actor LAST 45 MINUTES);
    LET Count12Day := count(BY Actor LAST 12 DAYS);

    # Bump the counter every minute for 5 minutes
    LET SqrlClock := dateAdd(StartClock, "PT0M");
    EXECUTE;
    LET SqrlClock := dateAdd(StartClock, "PT1M");
    EXECUTE;
    LET SqrlClock := dateAdd(StartClock, "PT2M");
    EXECUTE;
    LET SqrlClock := dateAdd(StartClock, "PT3M");
    EXECUTE;
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

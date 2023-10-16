/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
type autogen_any = any;

import { jsonTemplate } from "sqrl-common";
import { runSqrl, buildRedisTestInstance } from "./helpers/runSqrl";
import { Instance, TestLogger } from "sqrl";
import "jest-extended";

let instance: Instance;
beforeEach(async () => {
  instance = await buildRedisTestInstance();
});

async function getResult(sqrl: string) {
  return runSqrl(sqrl, { instance }).then(({ lastExecution }) => {
    return lastExecution.fetchValue("Result");
  });
}

test("Basic test works", async () => {
  await runSqrl(
    `
    LET Ip := "1.2.3.4";
    ASSERT rateLimited(BY Ip MAX 2 EVERY DAY) = false;
    EXECUTE;
    ASSERT rateLimited(BY Ip MAX 2 EVERY DAY) = false;
    EXECUTE;
    ASSERT rateLimited(BY Ip MAX 2 EVERY DAY) = true;
    EXECUTE;

    LET SqrlClock := dateAdd(now(), "P1D");
    ASSERT rateLimited(BY Ip MAX 2 EVERY DAY) = false;
    EXECUTE;
    `,
    { instance }
  );
});

test("out of order events work", async () => {
  await runSqrl(
    `
    LET StartClock := now();

    LET Ip := "1.2.3.4";

    # Log one event 25 seconds in the future
    LET SqrlClock := dateAdd(StartClock, "PT25S");
    ASSERT rateLimit(BY Ip EVERY 10 SECONDS) = 1;
    EXECUTE;

    # Unexpected times before that event all use the same rate limit
    LET SqrlClock := dateAdd(StartClock, "PT5S");
    ASSERT rateLimit(BY Ip EVERY 10 SECONDS) = 0;
    EXECUTE;
    LET SqrlClock := dateAdd(StartClock, "PT20S");
    ASSERT rateLimit(BY Ip EVERY 10 SECONDS) = 0;
    EXECUTE;
    LET SqrlClock := dateAdd(StartClock, "PT1S");
    ASSERT rateLimit(BY Ip EVERY 10 SECONDS) = 0;
    EXECUTE;

    # But 10 seconds after the initial event, rate limit is reset
    LET SqrlClock := dateAdd(StartClock, "PT35S");
    ASSERT rateLimit(BY Ip EVERY 10 SECONDS) = 1;
    EXECUTE;
    `,
    { instance }
  );
});

test("take works with features", async () => {
  const run = () =>
    getResult(
      jsonTemplate`
LET Value := "1.2.3.4";
LET TakeAmount := 3.5;
LET Result := rateLimit(BY Value MAX 3 EVERY 60 SECOND TAKE TakeAmount);
  `
    );

  expect(await run()).toEqual(3);
  expect(await run()).toEqual(0);
});

test("take works with ints", async () => {
  const run = () => {
    return getResult(
      jsonTemplate`
LET Value := "1.2.3.4";
LET Result := rateLimit(BY Value MAX 3 EVERY 60 SECOND TAKE 3);
    `
    );
  };

  expect(await run()).toEqual(3);
  expect(await run()).toEqual(0);
});

test("works with retries", () =>
  runSqrl(
    `
      LET Ip := '1.2.3.4';
      LET Result := rateLimit(BY Ip MAX 3 EVERY 60 SECOND);
      LET Blocked := rateLimited(BY Ip MAX 3 EVERY 60 SECOND);

      # Expire the 1.2.3.4 rate limit as per usual
      ASSERT Result = 3; EXECUTE;
      ASSERT Result = 2; EXECUTE;
      ASSERT Result = 1; EXECUTE;
      ASSERT Result = 0; EXECUTE;
      ASSERT Result = 0; EXECUTE;

      # Take two off of 1.2.3.5
      LET Ip := '1.2.3.5';
      ASSERT Result = 3; EXECUTE;
      ASSERT Result = 2; EXECUTE;

      # Once we're a retry the rate limit should stop decreasing
      LET SqrlMutate := false;
      ASSERT Result = 1; EXECUTE;
      ASSERT Result = 1; EXECUTE;
      ASSERT Blocked = false;

      # 1.2.3.4 should be rate limited though
      LET Ip := '1.2.3.4';
      ASSERT Result = 0; EXECUTE;
      ASSERT Result = 0; EXECUTE;
      ASSERT Blocked = true;
    `,
    { instance }
  ));

test("returns rate limited multi values", () =>
  runSqrl(
    `
  LET TriGrams := entityList("TriGrams", ["julian ate food", "lunch was good"]);
  LET RateLimitedTriGrams := rateLimited(BY TriGrams MAX 1 EVERY 1 DAY);
  LET RateLimitedTriGramsValues := rateLimitedValues(BY TriGrams MAX 1 EVERY 1 DAY);
  ASSERT RateLimitedTriGrams = false;
  ASSERT RateLimitedTriGramsValues = [];

  LET TriGrams := entityList("TriGrams", [
    "julian ate food",
    "julian ate food",
    "lunch was good",
    "dinner be better",
  ]);

  EXECUTE;

  ASSERT RateLimitedTriGrams = true;
  ASSERT RateLimitedTriGramsValues = [
    "julian ate food",
    "julian ate food",
    "lunch was good"
  ];
`,
    { instance }
  ));

test("works with multiple values", async () => {
  const logger = new TestLogger();
  const run = (ip?: autogen_any, machine?: autogen_any) => {
    return runSqrl(
      `
LET Value1 := ${JSON.stringify(ip)};
LET Value2 := ${JSON.stringify(machine)};
LET Result := rateLimit(BY Value1, Value2 MAX 3 EVERY 60 SECOND);
    `,
      { instance, logger }
    ).then(({ lastExecution }) => {
      return lastExecution.fetchValue("Result");
    });
  };

  expect(await run("8.8.8.8", "M1")).toEqual(3);
  expect(await run("8.8.8.8", "M1")).toEqual(2);
  expect(await run("8.8.8.8", "M2")).toEqual(3);
  expect(await run("8.8.8.8", ["M1", "M2"])).toEqual(1);
  expect(await run("8.8.8.8", "M2")).toEqual(1);
  expect(await run("8.8.8.8", "M2")).toEqual(0);
  expect(await run("1.2.3.4", "M2")).toEqual(3);
  expect(await run("1.2.3.4", ["M2"])).toEqual(2);
  expect(await run(["1.2.3.4"], "M2")).toEqual(1);
  expect(await run("1.2.3.4", "M2")).toEqual(0);
  expect(await run("1.2.3.4", "M2")).toEqual(0);

  // Null because we only allow a single array feature
  expect(await run(["1.2.3.4"], ["M2"])).toEqual(null);

  // Make sure the last line logged an error
  expect(
    logger.popLatest({
      level: "error",
    }).msg
  ).toStartWith(
    "Error in sqrl function _getKeyList: Error: Exceeded sqrl maximum array count:: 2 of 1"
  );
  expect(logger.countErrors()).toEqual(0);
});
/*
test(
  "take with non numbers doesn't blow up",
  
  async function(testCase) {
    const run: autogen_any = (): autogen_any => {
      return testCase
        .graph()
        .values({
          Value: '1.2.3.4',
          TakeAmount: [3],
          TakeTwoAmount: 'I am not a number',
          SqrlMutate: true,
        })
        .sqrl(
          `
LET Value := loadFromGraph("Value");
LET TakeAmount := loadFromGraph("TakeAmount");
LET TakeTwoAmount := loadFromGraph("TakeTwoAmount");
LET Result := rateLimit(BY Value MAX 3 EVERY 60 SECOND TAKE TakeAmount);
LET ResultTwo := rateLimit(BY Value MAX 2 EVERY 60 SECOND TAKE TakeTwoAmount);
    `
        )
        .then((state?: autogen_any): autogen_any => {
          return state.fetchByName('Result');
        });
    };

    expect(await run('1.2.3.4')).toEqual(null);
    expect(await run('1.2.3.4')).toEqual(null);
  }
);

test(
  'works in the simple case',
 
  async function(testCase) {
    const run: autogen_any = (ip?: autogen_any): autogen_any => {
      return testCase
        .graph()
        .values({
          Value: ip,
          SqrlMutate: true,
        })
        .sqrl(
          `
LET Value := loadFromGraph("Value");
LET Result := rateLimit(BY Value MAX 3 EVERY 60 SECOND);
    `
        )
        .then((state?: autogen_any): autogen_any => {
          return state.fetchByName('Result');
        });
    };

    expect(await run('1.2.3.4')).toEqual(3);
    expect(await run('1.2.3.4')).toEqual(2);
    expect(await run('1.2.3.4')).toEqual(1);
    expect(await run('1.2.3.4')).toEqual(0);
    expect(await run('1.2.3.4')).toEqual(0);
    expect(await run('1.2.3.5')).toEqual(3);
    expect(await run('1.2.3.4')).toEqual(0);
    expect(await run('1.2.3.5')).toEqual(2);
    expect(await run(null)).toEqual(null);
    expect(await run(['1.2.3.5', '1.2.3.6'])).toEqual(1);

    expect(await run(['8.8.8.8', null])).toEqual(3);
    expect(await run([null, '8.8.8.8'])).toEqual(2);
    expect(await run([null, null])).toEqual(null);
    expect(await run(['8.8.8.8'])).toEqual(1);
    expect(await run('8.8.8.8')).toEqual(0);
  }
);

test(
  'default max value',
  async function(testCase) {
    const run: autogen_any = (value?: autogen_any): autogen_any => {
      return testCase
        .graph()
        .values({
          Value: value,
          SqrlMutate: true,
        })
        .sqrl(
          `
LET Value := loadFromGraph("Value");
LET Result := rateLimit(BY Value EVERY 60 SECOND);
    `
        )
        .then((state?: autogen_any): autogen_any => {
          return state.fetchByName('Result');
        });
    };

    expect(await run('1.2.3.4')).toEqual(1);
    expect(await run('1.2.3.4')).toEqual(0);
    expect(await run(['1.2.3.5', '1.2.3.6'])).toEqual(1);
  }
);

test(
  'returns rate limited singleton values',
  
  (test?: autogen_any): autogen_any =>
    test.sqrl(`
  LET Ip := ip("1.2.3.4");
  LET SqrlMutate := true;
  LET RateLimitedIp := rateLimited(BY Ip MAX 1 EVERY 1 DAY);
  LET RateLimitedIpValues := rateLimitedValues(BY Ip MAX 1 EVERY 1 DAY);
  ASSERT RateLimitedIp = false;
  ASSERT RateLimitedIpValues = [];

  EXECUTE;

  ASSERT RateLimitedIp = true;
  ASSERT RateLimitedIpValues = ['1.2.3.4'];
`)
);

  test(
    'sqrl-count works',
    
    async function(test) {
      const sqrl: autogen_any = (values: autogen_any = {}): autogen_any => `
LET Abc := ${JSON.stringify(values.Abc || null)};
LET Ip := ip(${JSON.stringify(values.Ip || '1.2.3.4')});
LET Machine := entity('Machine', ${JSON.stringify(values.Machine || null)});
    `;
      await test.setCustomerData(
        'rules/main.sqrl',
        `
        LET Abc := null;
        LET Ip := ip('1.2.3.4');
        LET Machine := null;
        LET Machine1Minute2RateLimit := rateLimit(BY Machine MAX 2 EVERY 60 SECOND STRICT);
        LET Machine1Minute2RateLimited := rateLimited(BY Machine MAX 2 EVERY 60 SECOND STRICT);
        LET MissingWhere := rateLimited(BY Machine MAX 1 EVERY 60 SECOND STRICT WHERE Abc);
        CREATE RULE MissingWhereRule WHERE MissingWhere;
        CREATE RULE InlineRateLimitWhere WHERE rateLimited(BY Ip MAX 1 EVERY 30 SECOND STRICT WHERE Abc);
        `
      );

      // Run some simple sqrl statements
      const run: autogen_any = (values: autogen_any = {}): autogen_any => {
        return test
          .graph()
          .values({
            SqrlMutate: true,
          })
          .sqrl(
            sqrl(
              merge(
                {
                  Machine: 'M1',
                  Ip: '1.2.3.4',
                  Abc: false,
                },
                values
              )
            )
          );
      };

      // Check the named slots
      await test
        .graph()
        .checkSqrlFeatures(
          [
            'Abc',
            'source:Clock',
            'source:SqrlClock',
            'InlineRateLimitWhere',
            'Ip',
            'Machine',
            'Machine1Minute2RateLimit',
            'Machine1Minute2RateLimited',
            'MissingWhere',
            'MissingWhereRule',
            'RateLimit/3e1befb7be5cd8b451feebcef44765b1',
            'RateLimit/5449578839f0cf8ca9977c96176d4c1d',
            'RateLimit/d6d71123c0a686d2d7b7e7759e27bd66',
            'SqrlMutate',
            'WritableObjects',
            'bool(Abc:01)',
            'key(RateLimit/3e1befb7be5cd8b451feebcef44765b1)',
            'key(RateLimit/5449578839f0cf8ca9977c96176d4c1d)',
            'key(RateLimit/d6d71123c0a686d2d7b7e7759e27bd66)',
            'entity(RateLimit/3e1befb7be5cd8b451feebcef44765b1)',
            'entity(RateLimit/5449578839f0cf8ca9977c96176d4c1d)',
            'entity(RateLimit/d6d71123c0a686d2d7b7e7759e27bd66)',
          ],
          {
            expectedResultFile: 'rateLimitSource.json',
          }
        );

      let state: autogen_any = await run();
      expect(await state.fetchByName('Machine1Minute2RateLimit')).toBe(2);
      expect(await state.fetchByName('Machine1Minute2RateLimited')).toBe(false);
      expect(await state.fetchByName('MissingWhere')).toBe(false);
      expect(await state.fetchByName('MissingWhereRule')).toBe(false);
      expect(await state.fetchByName('InlineRateLimitWhere')).toBe(false);

      state = await run();
      expect(await state.fetchByName('Machine1Minute2RateLimit')).toBe(1);
      expect(await state.fetchByName('Machine1Minute2RateLimited')).toBe(false);
      expect(await state.fetchByName('MissingWhere')).toBe(false);

      // New machine / IP get new quotas
      state = await run({ Machine: 'M2', Ip: '12.3.5' });
      expect(await state.fetchByName('Machine1Minute2RateLimit')).toBe(2);
      expect(await state.fetchByName('Machine1Minute2RateLimited')).toBe(false);
      expect(await state.fetchByName('MissingWhere')).toBe(false);

      // test time have the where clause fire.
      state = await run({ Abc: true });
      expect(await state.fetchByName('Machine1Minute2RateLimit')).toBe(0);
      expect(await state.fetchByName('Machine1Minute2RateLimited')).toBe(true);
      expect(await state.fetchByName('MissingWhere')).toBe(false);
      expect(await state.fetchByName('MissingWhereRule')).toBe(false);
      expect(await state.fetchByName('InlineRateLimitWhere')).toBe(false);

      // Check once more that not ALL machines are rate limited
      state = await run({ Machine: 'M3', Ip: '2.3.5.6' });
      expect(await state.fetchByName('Machine1Minute2RateLimit')).toBe(2);
      expect(await state.fetchByName('Machine1Minute2RateLimited')).toBe(false);
      expect(await state.fetchByName('MissingWhere')).toBe(false);

      state = await run({ Abc: true });
      expect(await state.fetchByName('MissingWhere')).toBe(true);
      expect(await state.fetchByName('MissingWhereRule')).toBe(true);
      expect(await state.fetchByName('InlineRateLimitWhere')).toBe(true);
    }
  );

  test(
    'raises errors on different take',
    
    async function(test) {
      // @TODO: We should make this a sqrlInvariant at some point
      expect(
        await test.errorString(
          test.graph().sqrl(`
LET Machine1Minute2RateLimit := rateLimit(BY Machine MAX 2 EVERY 60 SECOND STRICT);
LET Machine1Minute2RateLimited := rateLimited(BY Machine MAX 2 EVERY 60 SECOND TAKE 2 STRICT);
    `)
        )
      ).toStartWith('Error: Slots saved with the same name must be identical::');
    }
  );
});


*/

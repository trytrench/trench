/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-submodule-imports (@TODO)
import {
  AT,
  AstBuilder,
  SqrlKey,
  CompileState,
  Execution,
  Instance,
  sqrlInvariant,
  Ast,
  CustomCallAst,
} from "sqrl";

import { parse } from "./parser/sqrlRedisParser";

import { invariant, removeIndent } from "sqrl-common";
import {
  CountArguments,
  TrendingArguments,
  AliasedFeature,
  Timespan,
} from "./parser/sqrlRedis";
import { CountService } from "./Services";

const ENTITY_TYPE = "Counter";
const HOUR_MS = 3600 * 1000;
const DAY_MS = HOUR_MS * 24;

function dayDuration(days: number): Timespan {
  return {
    type: "duration",
    durationMs: days * DAY_MS,
  };
}

const PREVIOUS_CONFIG: {
  [timespan: string]: {
    subtractLeft: Timespan;
    subtractRight: Timespan;
    allowNegativeValue: boolean;
  };
} = {
  // These counters extract what should always be a larger value from a
  // smaller one. If they are negative than the value should be ignored
  // (i.e. in the case of not enough data.)
  previousLastDay: {
    subtractLeft: dayDuration(2),
    subtractRight: dayDuration(1),
    allowNegativeValue: false,
  },
  previousLastWeek: {
    subtractLeft: dayDuration(14),
    subtractRight: dayDuration(7),
    allowNegativeValue: false,
  },
  // dayWeekAgo is internal only
  dayWeekAgo: {
    subtractLeft: dayDuration(8),
    subtractRight: dayDuration(7),
    allowNegativeValue: false,
  },

  // These x-over-y counters can be negative, but should still be null in
  // the initial missing data cases.
  dayOverDay: {
    subtractLeft: dayDuration(1),
    subtractRight: { type: "previousLastDay" },
    allowNegativeValue: true,
  },
  dayOverWeek: {
    subtractLeft: dayDuration(1),
    subtractRight: { type: "dayWeekAgo" },
    allowNegativeValue: true,
  },
  weekOverWeek: {
    subtractLeft: dayDuration(7),
    subtractRight: { type: "previousLastWeek" },
    allowNegativeValue: true,
  },
};

const TRENDING_CONFIG: {
  [timespan: string]: {
    current: Timespan;
    currentAndPrevious: Timespan;
  };
} = {
  dayOverDay: {
    current: dayDuration(1),
    currentAndPrevious: dayDuration(2),
  },
  dayOverFullWeek: {
    current: dayDuration(1),
    currentAndPrevious: dayDuration(7),
  },
  weekOverWeek: {
    current: dayDuration(7),
    currentAndPrevious: dayDuration(14),
  },
};

export interface CountServiceBumpProps {
  at: number;
  keys: SqrlKey[];
  by: number;
  windowMs: number;
}

function interpretCountArgs(
  state: CompileState,
  sourceAst: Ast,
  args: CountArguments
) {
  const { whereAst, whereFeatures, whereTruth } = state.combineGlobalWhere(
    args.where
  );

  const counterProps: {
    features: string[];
    whereFeatures?: string[];
    whereTruth?: string;
    sumFeature?: string;
  } = {
    features: args.features.map((feature: AliasedFeature) => feature.alias),
    whereFeatures,
    whereTruth,
  };

  // Include sumFeature in the key if provided - otherwise we will
  // just bump by 1 so leave it out of key.
  let bumpByAst: Ast = AstBuilder.constant(1);
  if (args.sumFeature) {
    counterProps.sumFeature = args.sumFeature.value;
    bumpByAst = AstBuilder.call("_getBumpBy", [args.sumFeature]);
  }

  const { entityAst, entityId } = state.addHashedEntity(
    sourceAst,
    ENTITY_TYPE,
    counterProps
  );

  const featuresAst = args.features.map((aliasFeature) =>
    AstBuilder.feature(aliasFeature.feature.value)
  );
  const featureString = featuresAst.map((ast) => ast.value).join("~");
  const keyedCounterName = `${entityId.getIdString()}~${featureString}`;
  const keysAst = state.setGlobal(
    sourceAst,
    AstBuilder.call("_getKeyList", [entityAst, ...featuresAst]),
    `key(${keyedCounterName})`
  );
  const hasAlias = args.features.some(
    (featureAst: AliasedFeature) =>
      featureAst.feature.value !== featureAst.alias
  );

  return {
    bumpByAst,
    hasAlias,
    keyedCounterName,
    keysAst,
    entityAst,
    entityId,
    whereAst,
    whereFeatures,
    whereTruth,
  };
}

function getWindowMsForTimespan(timespan: Timespan): number | null {
  if (timespan.type === "duration") {
    return timespan.durationMs;
  } else if (timespan.type === "total") {
    return null;
  } else {
    throw new Error("Unknown duration for timespan type: " + timespan.type);
  }
}

function getNameForTimespan(timespan: Timespan): string {
  if (timespan.type === "duration") {
    let name = "";
    let remaining = timespan.durationMs;
    if (remaining > DAY_MS) {
      name += Math.floor(remaining / DAY_MS).toString() + "D";
      remaining = remaining % DAY_MS;
    }
    name += remaining.toString();
    return name;
  } else {
    return timespan.type;
  }
}

export function ensureCounterBump(
  state: CompileState,
  sourceAst: Ast,
  args: CountArguments
) {
  const interpretResult = interpretCountArgs(state, sourceAst, args);

  const { hasAlias, whereAst, keyedCounterName, bumpByAst, keysAst } =
    interpretResult;

  // [@todo: check] Only base the counter identity on features/where
  if (hasAlias) {
    return interpretResult;
  }

  const windowMs = getWindowMsForTimespan(args.timespan);
  const slotAst = state.setGlobal(
    sourceAst,
    AstBuilder.call("_bumpCount", [
      AstBuilder.branch(whereAst, keysAst, AstBuilder.constant(null)),
      bumpByAst,
      AstBuilder.constant(windowMs),
    ]),
    `bump(${keyedCounterName}:${windowMs})`
  );
  state.addStatement("SqrlCountStatements", slotAst);

  return interpretResult;
}

export function registerCountFunctions(
  instance: Instance,
  service: CountService
) {
  instance.registerSync(
    function _getBumpBy(bumpBy: number) {
      if (typeof bumpBy !== "number") {
        return null;
      }
      return bumpBy > 0 ? bumpBy : null;
    },
    {
      args: [AT.feature],
    }
  );

  instance.registerStatement(
    "SqrlCountStatements",
    async function _bumpCount(state, keys, by, windowMs) {
      if (keys === null || by === null) {
        return null;
      }
      state.manipulator.addCallback(async (ctx) => {
        await service.bump(ctx, state.getClockMs(), keys, windowMs, by);
      });
    },
    {
      allowNull: true,
      allowSqrlObjects: true,
      args: [AT.state, AT.any, AT.any, AT.any],
    }
  );

  instance.register(
    function _fetchCountsFromDb(state: Execution, keys, windowMs) {
      if (keys === null) {
        return null;
      }
      return service.fetch(state.ctx, state.getClockMs(), keys, windowMs);
    },
    {
      allowNull: true,
      allowSqrlObjects: true,
      args: [AT.state, AT.any, AT.any],
    }
  );

  instance.register(
    async function _fetchTrendingDetails(
      state,
      keys,
      currentCounts,
      currentAndPreviousCounts,
      minEvents
    ) {
      if (!currentCounts || !currentAndPreviousCounts) {
        return [];
      }
      invariant(
        currentCounts.length === currentAndPreviousCounts.length &&
          currentCounts.length === keys.length,
        "Mismatched current/previous trending counts."
      );

      const rv = [];
      currentCounts.forEach((currentCount, i) => {
        const currentAndPreviousCount = currentAndPreviousCounts[i];
        if (
          currentCount === null ||
          currentCount < minEvents ||
          currentAndPreviousCount === null ||
          currentAndPreviousCount < currentCount
        ) {
          return;
        }

        const key = keys[i];
        invariant(key !== null, "Received null key for current count.");

        const previousCount = currentAndPreviousCount - currentCount;
        const magnitude = Math.log10(currentCount / Math.max(previousCount, 1));
        if (magnitude >= 1) {
          rv.push({
            key: key.featureValues,
            current: currentCount,
            previous: previousCount,
            delta: 2 * currentCount - currentAndPreviousCount,
            magnitude,
          });
        }
      });
      return rv;
    },
    {
      args: [AT.state, AT.any, AT.any, AT.any, AT.any],
      allowSqrlObjects: true,
    }
  );

  instance.registerCustom(
    function trending(state: CompileState, ast: CustomCallAst): Ast {
      const args: TrendingArguments = parse(ast.source, {
        startRule: "TrendingArguments",
      });
      const { timespan } = args;

      sqrlInvariant(
        ast,
        timespan.type === "dayOverDay" ||
          timespan.type === "weekOverWeek" ||
          timespan.type === "dayOverFullWeek",
        "Invalid timespan for trending. Expecting `DAY OVER DAY` or `WEEK OVER WEEK` or `DAY OVER FULL WEEK`"
      );

      const trendingConfig = TRENDING_CONFIG[timespan.type];
      const currentCountArgs: CountArguments = {
        features: args.features,
        sumFeature: null,
        timespan: trendingConfig.current,
        where: args.where,
      };

      const currentCountAst = databaseCountTransform(
        state,
        ast,
        currentCountArgs
      );

      const currentAndPreviousCountAst = databaseCountTransform(state, ast, {
        ...currentCountArgs,
        timespan: trendingConfig.currentAndPrevious,
      });

      const { keysAst } = interpretCountArgs(state, ast, currentCountArgs);

      return AstBuilder.call("_fetchTrendingDetails", [
        keysAst,
        currentCountAst,
        currentAndPreviousCountAst,
        AstBuilder.constant(args.minEvents),
      ]);
    },
    {
      argstring:
        "Feature[, ...] [WHERE Condition] [WITH MIN Count EVENTS] (Timespan)",
      docstring: removeIndent(`
      Returns values whose counts have gone up by an order of magnitude

      Timespans: DAY OVER DAY, DAY OVER WEEK, DAY OVER FULL WEEK
      `),
    }
  );

  function databaseCountTransform(
    state: CompileState,
    sourceAst: Ast,
    args: CountArguments
  ): Ast {
    const { keysAst } = ensureCounterBump(state, sourceAst, args);
    const windowMs = getWindowMsForTimespan(args.timespan);
    return AstBuilder.call("_fetchCountsFromDb", [
      keysAst,
      AstBuilder.constant(windowMs),
    ]);
  }

  function classifyCountTransform(
    state: CompileState,
    ast: CustomCallAst,
    args: CountArguments
  ) {
    const { hasAlias, keyedCounterName, whereAst } = interpretCountArgs(
      state,
      ast,
      args
    );

    // Rewrite this count as a subtraction between other counts (whoah)
    if (PREVIOUS_CONFIG.hasOwnProperty(args.timespan.type)) {
      const previousConfig = PREVIOUS_CONFIG[args.timespan.type];

      // Convert into a subtract(left, right)
      // We transform into calls to count() which in turn will get transformed
      // themselves. This is necessary because the previous config might
      // itself be a recursive count.
      //
      // weekOverWeek = lastWeek - previousLastWeek
      //              = lastWeek - (lastTwoWeeks - lastWeek)
      //
      const resultAst = AstBuilder.call("_subtract", [
        classifyCountTransform(state, ast, {
          ...args,
          timespan: previousConfig.subtractLeft,
        }),
        classifyCountTransform(state, ast, {
          ...args,
          timespan: previousConfig.subtractRight,
        }),
      ]);

      if (!previousConfig.allowNegativeValue) {
        const subtractionAst = state.setGlobal(
          ast,
          resultAst,
          `count(${args.timespan.type}:${keyedCounterName})`
        );
        return AstBuilder.branch(
          // if result < 0
          AstBuilder.call("_cmpL", [subtractionAst, AstBuilder.constant(0)]),
          // then null
          AstBuilder.constant(null),
          // else result
          subtractionAst
        );
      }

      return resultAst;
    }

    const addAst = AstBuilder.branch(
      AstBuilder.and([whereAst, AstBuilder.feature("SqrlIsClassify")]),
      AstBuilder.constant(1),
      AstBuilder.constant(0)
    );
    const resultAst = AstBuilder.call("_add", [
      hasAlias ? AstBuilder.constant(0) : addAst,
      AstBuilder.call("max", [
        AstBuilder.call("concat", [
          AstBuilder.constant([0]),
          databaseCountTransform(state, ast, args),
        ]),
      ]),
    ]);
    return state.setGlobal(
      ast,
      resultAst,
      `count(${getNameForTimespan(args.timespan)}:${keyedCounterName})`
    );
  }

  instance.registerCustom(
    function count(state: CompileState, ast: CustomCallAst): Ast {
      const args: CountArguments = parse(ast.source, {
        startRule: "CountArguments",
      });
      return classifyCountTransform(state, ast, args);
    },
    {
      argstring: "BY Feature[, ...] [WHERE Condition] [LAST Timespan]",
      docstring: removeIndent(`
      Returns the streaming count for the given window

      Timespans: LAST [X] SECONDS/MINUTES/HOURS/DAYS/WEEKS
                 DAY OVER DAY, DAY OVER WEEK, WEEK OVER WEEK
                 TOTAL
      `),
    }
  );
}

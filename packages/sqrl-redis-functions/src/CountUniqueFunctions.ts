/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-submodule-imports (@TODO)
import stringify = require("fast-stable-stringify");
import {
  Ast,
  AstBuilder,
  Context,
  Execution,
  Instance,
  SqrlObject,
  CompileState,
  AT,
  CustomCallAst,
} from "sqrl";
import * as murmurJs from "murmurhash3.js";
import { invariant, sqrlCartesianProduct } from "sqrl-common";
import { parse } from "./parser/sqrlRedisParser";
import { CountUniqueArguments, AliasedFeature } from "./parser/sqrlRedis";
import { CountUniqueService } from "./Services";

// This hashes a value to match output from slidingd
function slidingdHashHex(value) {
  if (value instanceof SqrlObject) {
    value = value.getBasicValue();
  }
  if (typeof value !== "string" && !(value instanceof Buffer)) {
    value = stringify(value);
  }

  const data = Buffer.from(murmurJs.x64.hash128(value));
  const hashHex = data.toString("hex");
  return hashHex.substring(16);
}

function isCountable(features) {
  return features.every((v) => {
    return v !== null && v !== "" && !(Array.isArray(v) && v.length === 0);
  });
}

function sortByAlias(features: AliasedFeature[]): AliasedFeature[] {
  return Array.from(features).sort((left, right) => {
    return left.alias.localeCompare(right.alias);
  });
}

const tupleToString = (tuple) => stringify(tuple.map(SqrlObject.ensureBasic));

export function registerCountUniqueFunctions(
  instance: Instance,
  service: CountUniqueService
) {
  instance.registerStatement(
    "SqrlCountUniqueStatements",
    async function _bumpCountUnique(state: Execution, keys, uniques, windowMs) {
      uniques = SqrlObject.ensureBasic(uniques);
      if (!keys || !keys.length || !isCountable(uniques)) {
        return;
      }

      // @TODO Figure out a better way to batch up these adds
      for (const features of sqrlCartesianProduct(uniques)) {
        const isTuple = features.length > 1;
        const element = isTuple ? tupleToString(features) : features[0];
        const hashes = [slidingdHashHex(element)];

        state.manipulator.addCallback(async (ctx) => {
          await Promise.all(
            keys.map((key) => {
              return service.bump(ctx, {
                at: state.getClockMs(),
                key,
                sortedHashes: hashes,
                windowMs,
              });
            })
          );
        });
      }
    },
    {
      allowNull: true,
      allowSqrlObjects: true,
      args: [AT.state, AT.any, AT.any.array, AT.any],
    }
  );

  instance.registerSync(
    function _unionCountUnique(left, right) {
      invariant(
        left instanceof Set && right instanceof Set,
        "expected left and right to be Sets"
      );
      let count = left.size;
      right.forEach((element) => {
        if (!left.has(element)) {
          count++;
        }
      });
      return count;
    },
    {
      allowSqrlObjects: true,
      args: [AT.any, AT.any],
    }
  );

  instance.registerSync(
    function _intersectCountUnique(left, right) {
      invariant(
        left instanceof Set && right instanceof Set,
        "expected left and right to be Sets"
      );
      let count = 0;
      left.forEach((element) => {
        if (right.has(element)) {
          count++;
        }
      });
      return count;
    },
    {
      allowSqrlObjects: true,
      args: [AT.any, AT.any],
    }
  );

  instance.register(
    function _fetchCountUnique(state, keys, windowMs, uniques) {
      uniques = SqrlObject.ensureBasic(uniques).map((value) => {
        if (typeof value === "number") {
          return "" + value;
        } else {
          return value;
        }
      });
      return fetchCount(
        state.ctx,
        service,
        keys,
        state.getClockMs(),
        windowMs,
        uniques
      );
    },
    {
      allowNull: true,
      allowSqrlObjects: true,
      args: [AT.state, AT.any.array, AT.any, AT.any.array],
    }
  );

  instance.register(
    async function _fetchCountUniqueElements(
      state,
      keys,
      windowStartMs,
      uniques
    ) {
      const hexElements = new Set();

      if (keys.length === 0) {
        return hexElements;
      }

      // If uniques are empty or we are not bumping do not fetch count with current values.
      let elements = [];
      uniques = SqrlObject.ensureBasic(uniques);
      if (isCountable(uniques)) {
        const products = sqrlCartesianProduct(uniques);
        elements = products.map((features) => {
          const isTuple = features.length > 1;
          return isTuple ? tupleToString(features) : features[0];
        });
      }

      elements.forEach((element) => {
        hexElements.add(slidingdHashHex(element));
      });

      const hashes = await service.fetchHashes(state.ctx, {
        keys,
        windowStartMs,
      });
      hashes.forEach((hash) => {
        hexElements.add(hash);
      });
      return hexElements;
    },
    {
      allowSqrlObjects: true,
      args: [AT.state, AT.any, AT.any, AT.any],
    }
  );

  instance.registerCustom(
    function countUnique(state: CompileState, ast: CustomCallAst): Ast {
      const args: CountUniqueArguments = parse(ast.source, {
        startRule: "CountUniqueArguments",
      });
      const { whereAst, whereFeatures, whereTruth } = state.combineGlobalWhere(
        args.where
      );

      const sortedUniques: AliasedFeature[] = sortByAlias(args.uniques);
      const sortedGroup: AliasedFeature[] = sortByAlias(args.groups);

      const uniquesAst = AstBuilder.list(sortedUniques.map((f) => f.feature));
      const windowMsAst = AstBuilder.constant(args.windowMs);

      const groupAliases = args.groups.map((feature) => feature.alias);
      const groupFeatures = args.groups.map((feature) => feature.feature.value);
      const groupHasAliases = args.groups.some(
        (f) => f.feature.value !== f.alias
      );
      const sortedGroupAliases = sortedGroup.map((feature) => feature.alias);

      const { entityId, entityAst } = state.addHashedEntity(
        ast,
        "UniqueCounter",
        {
          groups: sortedGroupAliases,
          uniques: sortedUniques.map((feature) => feature.alias),

          // Only include the where clauses if they're non-empty
          ...(whereTruth ? { whereFeatures, whereTruth } : {}),
        }
      );

      const originalKeysAst = state.setGlobal(
        ast,
        AstBuilder.call("_getKeyList", [
          entityAst,
          ...groupAliases.map((alias) => AstBuilder.feature(alias)),
        ]),
        `key(${entityId.getIdString()})`
      );

      // Always bump the counter according to the original keys (aliases)
      const slotAst = state.setGlobal(
        ast,
        AstBuilder.call("_bumpCountUnique", [
          AstBuilder.branch(
            whereAst,
            originalKeysAst,
            AstBuilder.constant(null)
          ),
          uniquesAst,
          windowMsAst,
        ])
      );
      state.addStatement("SqrlCountUniqueStatements", slotAst);

      let keysAst = originalKeysAst;
      let countExtraUniques: Ast = AstBuilder.branch(
        AstBuilder.and([whereAst, AstBuilder.feature("SqrlIsClassify")]),
        uniquesAst,
        AstBuilder.constant([])
      );

      if (groupHasAliases) {
        keysAst = state.setGlobal(
          ast,
          AstBuilder.call("_getKeyList", [
            entityAst,
            ...groupFeatures.map((feature) => AstBuilder.feature(feature)),
          ]),
          `key(${entityId.getIdString()}:${groupFeatures.join(",")})`
        );

        // If we're using aliases we only count the uniques in this request if
        // they exactly match the aliases that we used
        const aliasesEqualAst = AstBuilder.call("_cmpE", [
          AstBuilder.list(
            groupAliases.map((alias) => AstBuilder.feature(alias))
          ),
          AstBuilder.list(
            groupFeatures.map((feature) => AstBuilder.feature(feature))
          ),
        ]);
        countExtraUniques = AstBuilder.branch(
          aliasesEqualAst,
          countExtraUniques,
          AstBuilder.constant([])
        );
      }

      if (args.beforeAction) {
        countExtraUniques = AstBuilder.constant([]);
      }

      const originalCall = AstBuilder.call("_fetchCountUnique", [
        keysAst,
        windowMsAst,
        countExtraUniques,
      ]);

      if (args.setOperation) {
        throw new Error("@todo setOperation transform");
        /*
      const { operation, features } = args.setOperation;
      const rightCountArgs = Object.assign({}, args, {
        groups: features,
        setOperation: null
      });

      const rightCall = state._wrapped.transform(
        Object.assign({}, ast, {
          args: [rightCountArgs, ...ast.args.slice(1)]
        })
      );

      let setFunction;
      if (operation === "intersect") {
        setFunction = "_intersectCountUnique";
      } else if (operation === "union") {
        setFunction = "_unionCountUnique";
      } else {
        throw new Error("Unknown set operation: " + operation);
      }

      return AstBuilder.call(setFunction, [
        Object.assign({}, originalCall, {
          func: "_fetchCountUniqueElements"
        }),
        Object.assign({}, rightCall, { func: "_fetchCountUniqueElements" })
      ]);*/
      }

      return originalCall;
    },
    {
      argstring:
        "Feature[, ...] [GROUP BY Feature[, ...]] [WHERE Condition] [LAST Duration] [BEFORE ACTION]",
      docstring: "Performs a sliding window unique set count",
    }
  );

  async function fetchCount(
    ctx: Context,
    service: CountUniqueService,
    keys,
    clockMs,
    windowMs,
    uniques
  ) {
    if (keys.length === 0) {
      return 0;
    }

    // If uniques are empty or we are not bumping do not fetch count with current values.
    let elements = [];
    if (isCountable(uniques)) {
      const products = sqrlCartesianProduct(uniques);
      elements = products.map((features) => {
        const isTuple = features.length > 1;
        return isTuple ? tupleToString(features) : features[0];
      });
    }

    elements = elements.map(slidingdHashHex);

    const results = await service.fetchCounts(ctx, {
      keys,
      at: clockMs,
      windowMs,
      addHashes: elements,
    });
    return Math.round(Math.max(0, ...results));
  }
}

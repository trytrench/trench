/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-implicit-dependencies

import * as pegjs from "pegjs";
import * as tspegjs from "ts-pegjs";
import { readFileSync } from "fs";
import { join } from "path";

const source = readFileSync(join(__dirname, "sqrlRedis.pegjs"), {
  encoding: "utf-8",
});

const allowedStartRules = [
  "CountArguments",
  "TrendingArguments",
  "RateLimitArguments",
  "PercentileArguments",
  "PercentileForCallArguments",
  "CountPreviousArguments",
  "StreamingStatsArguments",
  "CountUniqueArguments",
  "SumArguments",
];
const pegOptions: pegjs.OutputFormatAmdCommonjs = {
  allowedStartRules,
  cache: true,
  output: "source",
  format: "commonjs",
  plugins: [tspegjs],
};

const returnTypes: { [type: string]: string } = {
  RepeatClause: "number",
};
for (const rule of allowedStartRules) {
  returnTypes[rule] = "Ast";
}

(pegOptions as any).returnTypes = returnTypes;
(pegOptions as any).tspegjs = {
  noTslint: false,
  tslintIgnores: [
    "ban-comma-operator",
    "no-empty",
    "no-unused-expression",
    "only-arrow-functions",
    "object-literal-shorthand",
    "trailing-comma",
    "object-literal-sort-keys",
    "one-variable-per-declaration",
    "max-line-length",
    "no-consecutive-blank-lines",
    "align",
  ].join(","),
  customHeader: `
  import { Ast, AstLocation } from "sqrl";
  `.replace(/^ */gm, ""),
  returnTypes,
};

const output = pegjs.generate(source, pegOptions);
process.stdout.write(output);

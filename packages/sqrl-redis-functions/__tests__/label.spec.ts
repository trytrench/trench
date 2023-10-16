/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runSqrl } from "./helpers/runSqrl";

test("Labeling works", async () => {
  await runSqrl(`
    LET SqrlMutate := true;
    LET Ip := entity("Ip", "1.2.3.4");

    addLabel(Ip, "mylabel") WHERE false;
    EXECUTE;
    ASSERT NOT hasLabel(Ip, "mylabel");

    addLabel(Ip, "mylabel");
    EXECUTE;
    ASSERT hasLabel(Ip, "mylabel"); # After write


    removeLabel(Ip, "mylabel");
    EXECUTE;

    ASSERT NOT hasLabel(Ip, "mylabel");
    `);
});

test("WHEN works", async () => {
  await runSqrl(`
  LET A := false;
  LET B := false;
  LET Ip := entity("Ip", "1.2.3.4");
  CREATE RULE X WHERE A;
  WHEN X THEN addLabel(Ip, "bad");
  EXECUTE;

  ASSERT NOT hasLabel(Ip, "bad");
  LET A := true;
  EXECUTE;

  ASSERT hasLabel(Ip, "bad");
  `);
});

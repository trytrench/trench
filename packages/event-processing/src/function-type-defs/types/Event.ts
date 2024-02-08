import { z } from "zod";
import { FnType } from "../enum";
import { createFnTypeDefBuilder } from "../builder";

export const eventFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.Event)
  .build();

import { z } from "zod";
import { FnType } from "./_enum";
import { createFnTypeDefBuilder } from "../builder";

export const eventFnDef = createFnTypeDefBuilder()
  .setFnType(FnType.Event)
  .setCreateResolver(({}) => {
    return async ({ event, getDependency }) => {
      return {
        data: event,
      };
    };
  })
  .build();

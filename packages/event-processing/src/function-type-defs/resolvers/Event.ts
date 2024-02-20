import { getUnixTime } from "date-fns";
import { eventFnDef } from "../types/Event";
import { createFnTypeResolverBuilder } from "../resolverBuilder";
import { StoreTable } from "../lib/store";

export const eventFnResolver = createFnTypeResolverBuilder()
  .setFnTypeDef(eventFnDef)
  .setCreateResolver(({}) => {
    return async ({ event, getDependency }) => {
      return {
        data: event,
      };
    };
  })
  .build();

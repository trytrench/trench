import { eventFnDef } from "../types/Event";
import { createFnTypeResolverBuilder } from "../resolverBuilder";

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

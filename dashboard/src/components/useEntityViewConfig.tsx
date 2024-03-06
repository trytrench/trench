import { Entity } from "event-processing";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { handleError } from "~/lib/handleError";
import { EntityFilterType, EntityViewConfig } from "~/shared/validation";
import { api } from "~/utils/api";

export const useEntityViewConfig = (seenWithEntity?: Entity) => {
  const router = useRouter();

  const { data: views } = api.entityViews.list.useQuery(
    {
      entityTypeId: seenWithEntity?.type ?? null,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const [viewConfig, setViewConfig] = useState<EntityViewConfig | null>(null);

  useEffect(() => {
    if (views?.[0]) {
      // If there are views, and the query param is set, set the view config
      if (router.query.view) {
        const view = views.find((view) => view.id === router.query.view);
        if (view) setViewConfig(view.config);
      } else {
        // // If there are views, but no query param, set the query param to the first view
        // router
        //   .replace({
        //     pathname: router.pathname,
        //     query: { ...router.query, view: views[0].id },
        //   })
        //   .catch(handleError);
      }
    }
  }, [views, router]);

  useEffect(() => {
    // If there are no views, default to viewing the first entity type
    if (views && !views.length && entityTypes?.[0] && !viewConfig) {
      setViewConfig({
        type: "grid",
        filters: [
          {
            type: EntityFilterType.EntityType,
            data: entityTypes[0].id,
          },
        ],
      });
    }
  }, [views, entityTypes, seenWithEntity, viewConfig]);

  return { viewConfig, setViewConfig };
};

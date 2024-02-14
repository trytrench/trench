import clsx from "clsx";
import { Entity, TypeName } from "event-processing";
import { LayoutGrid, List, Loader2Icon, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EntityCard } from "~/components/EntityCard";
import { Button } from "~/components/ui/button";
import { SpinnerButton } from "~/components/ui/custom/spinner-button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useEntityNameMap } from "~/hooks/useEntityNameMap";
import { handleError } from "~/lib/handleError";
import { EntityViewConfig } from "~/shared/validation";
import { api } from "~/utils/api";
import { EditEntityFilters } from "../components/filters/EditEntityFilters";
import { EditViewDialog } from "./EditViewDialog";
import { EntityListDataTable } from "./EntityListDataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Toggle } from "./ui/toggle";

const useEntityViewConfig = (seenWithEntity: Entity) => {
  const router = useRouter();

  const { data: views, refetch } = api.entityViews.list.useQuery({
    entityTypeId: seenWithEntity?.type ?? null,
  });

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const [viewConfig, setViewConfig] = useState<EntityViewConfig | null>(null);

  useEffect(() => {
    if (views?.[0]) {
      // If there are views, and the query param is set, set the view config
      if (router.query.view) {
        const view = views.find((view) => view.id === router.query.view);
        if (view) setViewConfig(view.config);
      } else {
        // If there are views, but no query param, set the query param to the first view
        router
          .push({
            pathname: router.pathname,
            query: { ...router.query, view: views[0].id },
          })
          .catch(handleError);
      }
    }
  }, [views, router]);

  useEffect(() => {
    // If there are no views, default to viewing the first entity type
    if (views && !views.length && entityTypes?.[0] && !viewConfig) {
      setViewConfig({
        type: "grid",
        filters: {
          entityType: entityTypes[0].id,
          seenWithEntity,
        },
      });
    }
  }, [views, entityTypes, seenWithEntity, viewConfig]);

  return { viewConfig, setViewConfig };
};

interface Props {
  seenWithEntity: Entity;
}

export const EntityList = ({ seenWithEntity }: Props) => {
  const router = useRouter();

  const { viewConfig, setViewConfig } = useEntityViewConfig(seenWithEntity);

  const { mutateAsync: createView } = api.entityViews.create.useMutation();
  const { mutateAsync: updateView } = api.entityViews.update.useMutation();
  const { mutateAsync: deleteView } = api.entityViews.delete.useMutation();

  const { data: views, refetch: refetchViews } = api.entityViews.list.useQuery({
    entityTypeId: seenWithEntity?.type ?? null,
  });
  const limit = 10;

  const [isEditing, setIsEditing] = useState(false);

  const {
    data: entities,
    isLoading: entitiesLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = api.lists.getEntitiesList.useInfiniteQuery(
    {
      entityFilters: viewConfig?.filters ?? {},
      // sortBy,
      // limit,
    },
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.rows.length < limit) return undefined;
        return pages.length * limit;
      },
      enabled: !!viewConfig,
    }
  );

  const { data: features } = api.features.list.useQuery();

  const filteredFeatures = useMemo(
    () =>
      features?.filter(
        (feature) => feature.entityTypeId === viewConfig?.filters.entityType
      ),
    [features, viewConfig]
  );

  const allEntities = useMemo(() => {
    return entities?.pages.flatMap((page) => page.rows) ?? [];
  }, [entities]);

  const entityIds = useMemo<string[]>(() => {
    return allEntities.flatMap((entity) => {
      return (
        entity.features
          .map((feature) => {
            if (
              feature.result.type === "success" &&
              feature.result.data.schema.type === TypeName.Entity
            ) {
              return feature.result.data.value.id;
            }
          })
          .filter(Boolean) ?? []
      );
    });
  }, [allEntities]);
  const entityNameMap = useEntityNameMap(entityIds);

  const handleTableConfigChange = useCallback(
    (config: Exclude<EntityViewConfig["tableConfig"], undefined>) => {
      if (viewConfig) setViewConfig({ ...viewConfig, tableConfig: config });
    },
    [viewConfig, setViewConfig]
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex p-3 px-8 border-b items-center">
        <EditEntityFilters
          value={viewConfig?.filters ?? {}}
          onChange={(filters) => {
            if (viewConfig) setViewConfig({ ...viewConfig, filters });
          }}
        />

        <div className="flex gap-1">
          <Toggle
            className="h-6 flex items-center"
            onClick={() => {
              if (viewConfig) setViewConfig({ ...viewConfig, type: "grid" });
            }}
            pressed={viewConfig?.type === "grid"}
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            <span className="text-xs">Grid</span>
          </Toggle>
          <Toggle
            className="h-6 flex items-center"
            onClick={() => {
              if (viewConfig) setViewConfig({ ...viewConfig, type: "list" });
            }}
            pressed={viewConfig?.type === "list"}
          >
            <List className="h-4 w-4 mr-1.5" />
            <span className="text-xs">List</span>
          </Toggle>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="xs" variant="outline">
              Save
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem
              onSelect={() => {
                if (viewConfig && typeof router.query.view === "string") {
                  updateView({
                    id: router.query.view,
                    config: viewConfig,
                  })
                    .then(() => refetchViews())
                    .catch(handleError);
                }
              }}
            >
              Save to this view
            </DropdownMenuItem>

            <EditViewDialog
              title="Create new view"
              onSubmit={(values) => {
                if (viewConfig)
                  createView({
                    name: values.name,
                    config: viewConfig,
                    entityTypeId: seenWithEntity?.type,
                  })
                    .then(() => {
                      return refetchViews();
                    })
                    .catch(handleError);
              }}
            >
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                Create new view
              </DropdownMenuItem>
            </EditViewDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex h-full">
        <div className="w-64 border-r shrink-0 space-y-1 pt-4 px-6">
          <div className="text-sm font-medium text-emphasis-foreground">
            Views
          </div>
          {views?.map((view) => (
            <div
              onClick={() =>
                router.push({
                  pathname: router.pathname,
                  query: { ...router.query, view: view.id },
                })
              }
              key={view.id}
              className={clsx(
                "px-4 py-1 w-full text-sm text-muted-foreground text-left rounded-md transition flex justify-between items-center hover:bg-muted cursor-pointer",
                {
                  "bg-accent text-accent-foreground":
                    router.query.view === view.id,
                }
              )}
            >
              {view.name}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="iconXs"
                    variant="link"
                    className="h-3 ml-auto shrink-0"
                  >
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                  <EditViewDialog
                    title="Update view"
                    onSubmit={(values) => {
                      if (typeof router.query.view === "string") {
                        updateView({
                          id: router.query.view,
                          name: values.name,
                        })
                          .then(() => {
                            return refetchViews();
                          })
                          .catch(handleError);
                      }
                    }}
                  >
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      Rename
                    </DropdownMenuItem>
                  </EditViewDialog>

                  <DropdownMenuItem
                    onSelect={() => {
                      if (typeof router.query.view === "string") {
                        deleteView({ id: router.query.view })
                          .then(() => refetchViews())
                          .catch(handleError);
                      }
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>

        {viewConfig?.type === "grid" ? (
          <ScrollArea className="h-full flex-1">
            <div className="flex flex-col gap-4 px-8 py-4">
              {entitiesLoading ? (
                <Loader2Icon className="w-8 h-8 text-muted-foreground animate-spin self-center" />
              ) : (
                <>
                  {allEntities.map((entity) => {
                    return (
                      <EntityCard
                        key={`${entity.entityType}:${entity.entityId}`}
                        entity={entity}
                        entityNameMap={entityNameMap}
                        featureOrder={viewConfig.gridConfig?.featureOrder ?? []}
                        onFeatureOrderChange={(newOrder) =>
                          setViewConfig({
                            ...viewConfig,
                            gridConfig: {
                              featureOrder: newOrder,
                            },
                          })
                        }
                        isEditing={isEditing}
                        onIsEditingChange={setIsEditing}
                      />
                    );
                  })}
                  {hasNextPage && (
                    <div className="self-center my-4">
                      <SpinnerButton
                        variant="outline"
                        onClick={() => {
                          fetchNextPage().catch((err) => {
                            console.error(err);
                          });
                        }}
                        loading={isFetchingNextPage}
                      >
                        Fetch more entities
                      </SpinnerButton>
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        ) : (
          <EntityListDataTable
            features={filteredFeatures ?? []}
            entities={allEntities}
            config={
              viewConfig?.tableConfig ?? {
                columnVisibility: {},
                columnOrder: [],
              }
            }
            loading={entitiesLoading}
            onConfigChange={handleTableConfigChange}
          />
        )}

        <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-background pointer-events-none"></div>
      </div>
    </div>
  );
};

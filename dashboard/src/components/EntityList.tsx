import { Entity, TypeName } from "event-processing";
import { LayoutGrid, List, Loader2Icon } from "lucide-react";
import { useRouter } from "next/router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { EntityCard } from "~/components/EntityCard";
import { SpinnerButton } from "~/components/ui/custom/spinner-button";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useEntityNameMap } from "~/hooks/useEntityNameMap";
import { handleError } from "~/lib/handleError";
import { EntityViewConfig } from "~/shared/validation";
import { RouterInputs, RouterOutputs, api } from "~/utils/api";
import { EditEntityFilters } from "../components/filters/EditEntityFilters";
import { ViewsLayout } from "./ViewsLayout";
import { RenderEntityFilters } from "./filters/RenderEntityFilters";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { DataTableViewOptions } from "./ui/data-table-view-options";
import { Input } from "./ui/input";
import { DataTable } from "./ui/data-table";
import { Checkbox } from "@radix-ui/react-checkbox";
import {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
  ColumnOrderState,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  PaginationState,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { config } from "webpack";
import { RenderResult } from "./RenderResult";

const useEntityViewConfig = (seenWithEntity?: Entity) => {
  const router = useRouter();

  const { data: views } = api.entityViews.list.useQuery({
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
          .replace({
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
        filters: { entityType: entityTypes[0].id },
      });
    }
  }, [views, entityTypes, seenWithEntity, viewConfig]);

  return { viewConfig, setViewConfig };
};

interface Props {
  seenWithEntity?: Entity;
}

export const EntityList = ({ seenWithEntity }: Props) => {
  const router = useRouter();
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const { viewConfig, setViewConfig } = useEntityViewConfig(seenWithEntity);

  const { mutateAsync: createView } = api.entityViews.create.useMutation();
  const { mutateAsync: updateView } = api.entityViews.update.useMutation();
  const { mutateAsync: deleteView } = api.entityViews.delete.useMutation();

  const { data: views, refetch: refetchViews } = api.entityViews.list.useQuery({
    entityTypeId: seenWithEntity?.type ?? null,
  });
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });

  const [isEditing, setIsEditing] = useState(false);

  // const {
  //   data: entities,
  //   isLoading: entitiesLoading,
  //   fetchNextPage,
  //   isFetchingNextPage,
  //   hasNextPage,
  // } = api.lists.getEntitiesList.useInfiniteQuery(
  //   {
  //     entityFilters: {
  //       ...viewConfig?.filters,
  //       seenWithEntity,
  //     },
  //     // sortBy,
  //     limit: pagination.pageSize,
  //   },
  //   {
  //     getNextPageParam: (lastPage, pages) => {
  //       // if (lastPage.rows.length < pagination.pageSize) return undefined;
  //       return pages.length * pagination.pageSize;
  //     },
  //     enabled: viewConfig?.type === "grid",
  //   }
  // );

  const queryProps: RouterInputs["lists"]["getEntitiesList"] = useMemo(() => {
    return {
      entityFilters: {
        ...viewConfig?.filters,
        seenWithEntity,
      },
      limit: pagination.pageSize,
      cursor: pagination.pageIndex * pagination.pageSize,
    };
  }, [viewConfig, seenWithEntity, pagination]);

  const {
    data: entities,
    isLoading: entitiesTableLoading,
    isFetching: fetchingEntities,
  } = api.lists.getEntitiesList.useQuery(queryProps, {
    keepPreviousData: true,
    staleTime: 15000,
  });

  const { data: features } = api.features.list.useQuery();

  const filteredFeatures = useMemo(
    () =>
      features?.filter(
        (feature) => feature.entityTypeId === viewConfig?.filters.entityType
      ),
    [features, viewConfig]
  );

  const allEntities = useMemo(() => {
    return entities?.rows ?? [];
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
              const { type, id } = feature.result.data.value;
              return `${type}_${id}`;
            }
          })
          .filter(Boolean) ?? []
      );
    });
  }, [allEntities]);
  const entityNameMap = useEntityNameMap(entityIds);

  // Table
  type EntityData = RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  const columns: ColumnDef<EntityData>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "entityId",
        id: "ID",
        header: "ID",
      },
      {
        header: "Last Seen",
        id: "Last Seen",
        accessorFn: (row) => format(row.lastSeenAt, "MMM d, yyyy h:mm a"),
      },
      ...(filteredFeatures?.map(
        (feature) =>
          ({
            id: feature.name,
            header: feature.name,
            cell: ({ row }) => {
              const value = row.original.features.find(
                (f) => f.featureId === feature.id
              );
              if (!value) return null;
              return value.rule && value.result.type === "success" ? (
                value.result.data.value && (
                  <div className={`rounded-full ${value.rule.color} w-2 h-2`} />
                )
              ) : value.result ? (
                <RenderResult result={value.result} />
              ) : null;
            },
          }) as ColumnDef<EntityData>
      ) ?? []),
    ],
    [filteredFeatures]
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data: allEntities,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: (updater) => {
      setViewConfig((prevConfig) => {
        if (!prevConfig?.tableConfig) return prevConfig;
        return {
          ...prevConfig,
          tableConfig: {
            ...prevConfig.tableConfig,
            columnVisibility:
              typeof updater === "function"
                ? updater(prevConfig.tableConfig.columnVisibility)
                : updater,
          },
        };
      });
    },
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange: (updater) => {
      setViewConfig((prevConfig) => {
        if (!prevConfig?.tableConfig) return prevConfig;
        return {
          ...prevConfig,
          tableConfig: {
            ...prevConfig.tableConfig,
            columnOrder:
              typeof updater === "function"
                ? updater(prevConfig.tableConfig.columnOrder)
                : updater,
          },
        };
      });
    },
    onPaginationChange: setPagination,
    manualPagination: true,
    // autoResetPageIndex: false,
    pageCount: entities?.count
      ? Math.ceil(entities.count / pagination.pageSize)
      : 0,
    state: {
      sorting,
      columnFilters,
      columnVisibility: viewConfig?.tableConfig?.columnVisibility ?? {},
      rowSelection,
      columnOrder: viewConfig?.tableConfig?.columnOrder ?? [],
      pagination,
    },
  });

  // If config hasn't been set or the entity type changed, set it to the default
  useEffect(() => {
    const config = viewConfig?.tableConfig;
    if (!config) return;
    if (
      !config.columnOrder.length ||
      config.columnOrder.some((column) => !columns.some((c) => c.id === column))
    ) {
      setViewConfig((prevConfig) => {
        if (!prevConfig?.tableConfig) return prevConfig;
        return {
          ...prevConfig,
          tableConfig: {
            ...prevConfig.tableConfig,
            columnOrder: columns
              .map((column) => column.id ?? "")
              .filter(Boolean),
            columnVisibility: config.columnVisibility,
          },
        };
      });
    }
  }, [columns, setViewConfig, viewConfig?.tableConfig]);

  return (
    <ViewsLayout
      views={views ?? []}
      filterComponent={
        <EditEntityFilters
          value={viewConfig?.filters ?? {}}
          onChange={(filters) => {
            if (viewConfig) setViewConfig({ ...viewConfig, filters });
          }}
        />
      }
      toggleComponent={
        <Tabs
          value={viewConfig?.type}
          onValueChange={(value) => {
            if (!viewConfig) return;
            setViewConfig({
              ...viewConfig,
              type: value as "grid" | "list",
            });
          }}
        >
          <TabsList className="p-0.5">
            <TabsTrigger className="px-2" value="grid">
              <LayoutGrid className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger className="px-2" value="list">
              <List className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
      filtersComponent={
        !isEditing &&
        viewConfig?.filters &&
        Object.entries(viewConfig.filters).filter((filter) =>
          Array.isArray(filter[1]) ? filter[1].length : filter[1]
        ).length > 0 && (
          <div className="border-b px-6 py-3 flex justify-between"></div>
        ) ? (
          <RenderEntityFilters
            filters={viewConfig.filters}
            onFiltersChange={(filters) => {
              setViewConfig({
                ...viewConfig,
                filters,
              });
            }}
          />
        ) : undefined
      }
      onSave={() => {
        if (typeof router.query.view !== "string" || !viewConfig) return;
        updateView({
          id: router.query.view,
          config: viewConfig,
        })
          .then(() => refetchViews())
          .catch(handleError);
      }}
      onCreate={(name) => {
        if (!viewConfig) return;
        createView({
          name,
          config: viewConfig,
          entityTypeId: seenWithEntity?.type,
        })
          .then((view) => {
            router
              .replace({
                pathname: router.pathname,
                query: { ...router.query, view: view.id },
              })
              .catch(handleError);
            return refetchViews();
          })
          .catch(handleError);
      }}
      onRename={(name) => {
        if (typeof router.query.view !== "string") return;
        updateView({
          id: router.query.view,
          name,
        })
          .then(() => {
            return refetchViews();
          })
          .catch(handleError);
      }}
      onDelete={() => {
        if (typeof router.query.view !== "string") return;
        deleteView({ id: router.query.view })
          .then(() => refetchViews())
          .catch(handleError);
      }}
      onIsEditingChange={setIsEditing}
      isEditing={isEditing}
    >
      {viewConfig?.type === "grid" ? (
        <ScrollArea className="h-full">
          <div className="space-y-4 px-8 py-4">
            {entitiesTableLoading ? (
              <Loader2Icon className="w-8 h-8 text-muted-foreground animate-spin self-center" />
            ) : (
              <>
                {(isEditing ? allEntities.slice(0, 8) : allEntities).map(
                  (entity) => {
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
                      />
                    );
                  }
                )}
                {/* {hasNextPage && (
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
                )} */}
              </>
            )}
          </div>
        </ScrollArea>
      ) : (
        <div className="h-full py-4 px-8 overflow-y-auto">
          <DataTable
            table={table}
            loading={fetchingEntities}
            onRowClick={(entity) =>
              router.push(
                `/entity/${entityTypes?.find(
                  (et) => et.id === entity.entityType
                )?.type}/${entity.entityId}`
              )
            }
            renderHeader={(table) => (
              <>
                <Input
                  placeholder="Filter event types..."
                  value={
                    (table.getColumn("Name")?.getFilterValue() as string) ?? ""
                  }
                  onChange={(event) =>
                    table.getColumn("Name")?.setFilterValue(event.target.value)
                  }
                  className="max-w-sm"
                />
                <DataTableViewOptions table={table} />
              </>
            )}
          />
        </div>
      )}
    </ViewsLayout>
  );
};

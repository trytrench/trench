import { type Entity, TypeName } from "event-processing";
import {
  ChevronDown,
  ExternalLinkIcon,
  LayoutGrid,
  List,
  Loader2Icon,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { useRouter } from "next/router";
import {
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { EntityCard } from "~/components/EntityCard";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useEntityNameMap } from "~/hooks/useEntityNameMap";
import { handleError } from "~/lib/handleError";
import {
  type EntityFilter,
  EntityFilterType,
  type EntityViewConfig,
  getEntityFiltersOfType,
  featureFilterToText,
} from "~/shared/validation";
import { type RouterInputs, type RouterOutputs, api } from "~/utils/api";
import { EditEntityFilters } from "../components/filters/EditEntityFilters";
import { RenderEntityFilters } from "./filters/RenderEntityFilters";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { DataTableViewOptions } from "./ui/data-table-view-options";
import { Input } from "./ui/input";
import { DataTable } from "./ui/data-table";
import {
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type PaginationState,
} from "@tanstack/react-table";
import {
  addHours,
  format,
  getUnixTime,
  parse,
  startOfDay,
  subDays,
  subHours,
} from "date-fns";
import { RenderResult } from "./RenderResult";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { SidebarButton } from "./ui/custom/sidebar-button";
import { cn } from "../lib/utils";
import { useToast } from "./ui/use-toast";
import { customEncodeURIComponent } from "../lib/uri";
import Link from "next/link";
import { Skeleton } from "./ui/skeleton";
import { useBreakpoint } from "../hooks/useBreakpoint";
import { ComboboxSelector } from "./ComboboxSelector";
import { EntityChip } from "./EntityChip";
import pluralize from "pluralize";
import { ZoomBarChart } from "./ZoomBarChart";
import { CHART_INTERVAL_HOURS } from "../shared/config";

// const END_DATE = new Date("2024-02-28");
const END_DATE = new Date("2024-03-15");
const START_DATE = startOfDay(subDays(END_DATE, 30));

export function useEntityFiltersToText() {
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const entityFiltersToText = useCallback(
    (filters: EntityFilter[]) => {
      const eTypeFilter = getEntityFiltersOfType(
        filters,
        EntityFilterType.EntityType
      )[0]?.data;

      const featureFilters = getEntityFiltersOfType(
        filters,
        EntityFilterType.Feature
      );

      const entityType = entityTypes?.find((et) => et.id === eTypeFilter)?.type;

      let str = `${pluralize(entityType ?? "Entity")}`;

      if (featureFilters.length > 0) {
        str += ` with ${featureFilters
          .map((val) => featureFilterToText(val.data))
          .join(", ")}`;
      }

      return str;
    },
    [entityTypes]
  );

  return { entityFiltersToText };
}

interface Props {
  seenWithEntity?: Entity;
}

type EntityView = RouterOutputs["entityViews"]["list"][number];

type SeenFilter = Extract<EntityFilter, { type: EntityFilterType.Seen }>;

const DEFAULT_PAGINATION: PaginationState = {
  pageIndex: 0,
  pageSize: 50,
};

export function EntityList({ seenWithEntity }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { entityFiltersToText } = useEntityFiltersToText();

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  // const { viewConfig, setViewConfig } = useEntityViewConfig(seenWithEntity);

  const { mutateAsync: createView } = api.entityViews.create.useMutation();
  const { mutateAsync: updateView } = api.entityViews.update.useMutation();
  const { mutateAsync: deleteView } = api.entityViews.delete.useMutation();

  const {
    data: views,
    isLoading: loadingViews,
    refetch: refetchViews,
  } = api.entityViews.list.useQuery(
    {
      entityTypeId: seenWithEntity?.type ?? null,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }
  );

  const loadingViewsAndRouter = !router.isReady || loadingViews;

  const selectedViewId = router.query.view as string | undefined;

  const viewConfig = useMemo(() => {
    if (!views) return null;
    return views.find((view) => view.id === selectedViewId)?.config;
  }, [views, selectedViewId]);

  const selectedView = useMemo(() => {
    return views?.find((view) => view.id === selectedViewId);
  }, [views, selectedViewId]);

  const [pagination, setPagination] =
    useState<PaginationState>(DEFAULT_PAGINATION);

  const [isEditing, setIsEditing] = useState(false);

  const [currentViewState, setCurrentViewState] = useState<EntityViewConfig>({
    type: "grid",
    filters: [],
  });
  const [extraFilters, setExtraFilters] = useState<EntityFilter[]>([]);
  const [seenFilter, setSeenFilter] = useState<SeenFilter | undefined>();

  useEffect(() => {
    if (viewConfig) {
      setCurrentViewState({
        ...viewConfig,
        filters: [], // Filters are handled separately
      });
    } else {
      setCurrentViewState({
        type: "list",
        filters: [],
        tableConfig: undefined,
        gridConfig: undefined,
      });
    }

    // Reset pagination
    setPagination(DEFAULT_PAGINATION);
  }, [viewConfig]);

  const combinedFilters = useMemo(() => {
    const filters: EntityFilter[] = [];
    if (viewConfig) {
      filters.push(...viewConfig.filters);
    }
    filters.push(...extraFilters);
    if (seenWithEntity) {
      filters.push({
        type: EntityFilterType.SeenWithEntity,
        data: seenWithEntity,
      });
    }
    return filters;
  }, [viewConfig, extraFilters, seenWithEntity]);

  const queryProps: RouterInputs["lists"]["getEntitiesList"] = useMemo(() => {
    const allFilters = [...combinedFilters];
    if (seenFilter) {
      allFilters.push(seenFilter);
    }
    return {
      entityFilters: allFilters,
      limit: pagination.pageSize,
      cursor: pagination.pageIndex * pagination.pageSize,
    };
  }, [combinedFilters, seenFilter, pagination.pageSize, pagination.pageIndex]);

  const { data: entities, isFetching: fetchingEntities } =
    api.lists.getEntitiesList.useQuery(queryProps, {
      // keepPreviousData: true,
      staleTime: 15000,
      enabled: !loadingViewsAndRouter,
    });

  const binQueryProps: RouterInputs["charts"]["getEntityTimeData"] =
    useMemo(() => {
      return {
        start: START_DATE,
        end: END_DATE,
        charts: [
          {
            entityFilters: combinedFilters,
            label: entityFiltersToText(combinedFilters),
          },
        ],
      };
    }, [combinedFilters, entityFiltersToText]);

  const { data: entityBins } =
    api.charts.getEntityTimeData.useQuery(binQueryProps);

  const maxYValue = useMemo(() => {
    // Calculate avg and stdev of every bin
    const labels = entityBins?.labels ?? [];
    const binValues = Object.values(entityBins?.bins ?? {});

    const maxThreshold = Math.max(
      ...labels.map((label) => {
        const vals = binValues.map((bin) => bin[label] ?? 0);
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const stdev = Math.sqrt(
          vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length
        );

        const max = Math.max(...vals);

        return max;
        // if (max > avg + 4 * stdev) {
        //   return max;
        // }
        // return avg + 2 * stdev;
      })
    );

    return maxThreshold;
  }, [entityBins?.bins, entityBins?.labels]);

  const xAxisSelection: [string, string] | undefined = useMemo(() => {
    const x1 = seenFilter?.data.from;
    const x2 = seenFilter?.data.to;

    return x1 && x2
      ? [x1.toISOString(), subHours(x2, CHART_INTERVAL_HOURS).toISOString()]
      : undefined;
  }, [seenFilter?.data.from, seenFilter?.data.to]);

  const { data: features } = api.features.list.useQuery();

  const filteredFeatures = useMemo(() => {
    const entType =
      combinedFilters.find((filt) => filt.type === EntityFilterType.EntityType)
        ?.data ?? null;
    return features?.filter((feature) => feature.entityTypeId === entType);
  }, [combinedFilters, features]);

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
    }) as string[];
  }, [allEntities]);
  const entityNameMap = useEntityNameMap(entityIds);

  // Table
  type EntityData = RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
  const columns: ColumnDef<EntityData>[] = useMemo(
    () => [
      {
        accessorKey: "entityId",
        id: "ID",
        header: "ID",
      },
      {
        header: "Last Seen",
        id: "Last Seen",
        accessorFn: (row) => format(row.lastSeenAt, "MMM d, yyyy h:mm a"),
        // accessorFn: (row) => getUnixTime(row.lastSeenAt),
      },
      {
        header: "Link",
        id: "Link",
        cell: ({ row }) => {
          const entTypeName = entityTypes?.find(
            (et) => et.id === row.original.entityType
          )?.type;
          const entId = row.original.entityId;
          return (
            <Link
              href={`/entity/${customEncodeURIComponent(
                entTypeName
              )}/${customEncodeURIComponent(entId)}`}
            >
              <ExternalLinkIcon
                className="my-auto text-foreground opacity-30 hover:opacity-70 transition"
                size={16}
              />
            </Link>
          );
        },
      },
      {
        header: "Type",
        id: "Type",
        accessorFn: (row) => {
          const entType = entityTypes?.find((et) => et.id === row.entityType);
          return entType?.type;
        },
      },
      {
        header: "Name",
        id: "Name",
        cell: ({ row }) => {
          const nameFeature = row.original.features.find(
            (f) =>
              f.result.type === "success" &&
              f.result.data.schema.type === TypeName.Name
          );
          return nameFeature?.result.type === "success"
            ? nameFeature.result.data.value
            : row.original.entityId;
        },
      },
      ...(filteredFeatures
        ?.filter((f) => f.schema.type !== TypeName.Name)
        .map(
          (feature) =>
            ({
              id: feature.id,
              header: feature.name,
              cell: ({ row }) => {
                const value = row.original.features.find(
                  (f) => f.featureId === feature.id
                );
                if (!value) return null;
                return value.rule && value.result.type === "success" ? (
                  value.result.data.value && (
                    <div
                      className={`rounded-full ${value.rule.color} w-2 h-2`}
                    />
                  )
                ) : value.result ? (
                  <div
                  // className={cn({
                  //   "text-right":
                  //     value.result.type === "success" &&
                  //     (value.result.data.schema.type === TypeName.Float64 ||
                  //       value.result.data.schema.type === TypeName.Int64),
                  // })}
                  >
                    {value.result.type === "success" &&
                    value.result.data.schema.type === TypeName.Entity ? (
                      <div className="-my-2">
                        <EntityChip
                          entityId={value.result.data.value.id}
                          entityType={value.result.data.value.type}
                          name={
                            entityNameMap[value.result.data.value.id] ??
                            value.result.data.value.id
                          }
                          href={`/entity/${entityTypes?.find(
                            (et) =>
                              value.result.type === "success" &&
                              et.id === value.result.data.value.type
                          )?.type}/${value.result.data.value.id}`}
                        />
                      </div>
                    ) : (
                      <RenderResult
                        result={value.result}
                        metadata={feature.metadata}
                      />
                    )}
                  </div>
                ) : null;
              },
            }) as ColumnDef<EntityData>
        ) ?? []),
    ],
    [entityTypes, filteredFeatures, entityNameMap]
  );

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});

  const handleTableConfigChange = useCallback(
    (updater: SetStateAction<EntityView["config"]["tableConfig"]>) => {
      setCurrentViewState((prev) => {
        return {
          ...prev,
          tableConfig:
            typeof updater === "function"
              ? updater(prev?.tableConfig)
              : updater,
        };
      });
    },
    []
  );

  useEffect(() => {
    setCurrentViewState((prev) => {
      // Add new columns to the end of the column order
      const columnIds = columns.map((c) => c.id ?? "");
      const oldColIds = new Set(prev.tableConfig?.columnOrder ?? []);
      const newColOrder = [
        ...(prev.tableConfig?.columnOrder ?? []),
        ...columnIds.filter((id) => !oldColIds.has(id)),
      ];
      return {
        ...prev,
        tableConfig: {
          ...prev.tableConfig,
          columnOrder: newColOrder,
        },
      };
    });
  }, [columns]);

  const { isMd } = useBreakpoint("md");

  const table = useReactTable({
    data: allEntities,
    columns,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: (updater) => {
      handleTableConfigChange((prev) => {
        const colVis =
          typeof updater === "function"
            ? updater(prev?.columnVisibility ?? {})
            : updater;

        return {
          ...prev,
          columnVisibility: colVis,
        };
      });
    },
    onColumnSizingChange: (updater) => {
      handleTableConfigChange((prev) => {
        return {
          ...prev,
          columnSizing:
            typeof updater === "function"
              ? updater(prev?.columnSizing ?? {})
              : updater,
        };
      });
    },
    onColumnOrderChange: (updater) => {
      handleTableConfigChange((prev) => {
        const newColOrder =
          typeof updater === "function"
            ? updater(prev?.columnOrder ?? [])
            : updater;
        return {
          ...prev,
          columnOrder: [
            ...newColOrder,
            // ...visibleColumnIds.filter((id) => !newColOrderSet.has(id)),
          ],
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
      rowSelection,
      columnVisibility: currentViewState.tableConfig?.columnVisibility,
      columnSizing: currentViewState.tableConfig?.columnSizing ?? {},
      columnOrder:
        currentViewState.tableConfig?.columnOrder ??
        columns.map((c) => c.id ?? ""),
      pagination,
    },
  });

  const [isChartSelectorOpen, setIsChartSelectorOpen] = useState(false);

  return (
    <div className="h-full flex flex-col md:flex-row">
      <div className="hidden md:block w-64 border-r shrink-0 pt-4 px-6 md:h-full">
        <div className="flex items-center mb-2">
          <div className="text-sm font-medium text-emphasis-foreground">
            Views
          </div>
          <button
            className="rounded-md flex items-center p-0.5 ml-1 data-[state=open]:bg-muted hover:bg-muted transition"
            onClick={() => {
              const newViewName = `New View ${(views?.length ?? 0) + 1}`;
              createView({
                name: newViewName,
                config: {
                  type: "list",
                  filters: [],
                },
                entityTypeId: seenWithEntity?.type,
              })
                .then(() => refetchViews())
                .then(() => {
                  toast({
                    title: "New view created successfully",
                  });
                })
                .catch(handleError);
            }}
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        {loadingViewsAndRouter ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton className="h-[20px] mt-2" key={idx} />
          ))
        ) : (
          <>
            <SidebarButton
              onClick={() =>
                router.push({
                  pathname: router.pathname,
                  query: { ...router.query, view: undefined },
                })
              }
              selected={!selectedViewId}
            >
              All Entities
            </SidebarButton>
            {views?.map((view) => (
              <SidebarButton
                key={view.id}
                onClick={() =>
                  router.push({
                    pathname: router.pathname,
                    query: { ...router.query, view: view.id },
                  })
                }
                selected={view.id === selectedViewId}
              >
                {view.name}
              </SidebarButton>
            ))}
          </>
        )}
      </div>
      <div className="h-full grow overflow-auto flex flex-col">
        <div className="shrink-0">
          <EditEntityView
            allViews={views ?? []}
            view={selectedView}
            onViewChange={(newView) => {
              if (selectedView) {
                updateView({
                  id: selectedView.id,
                  name: newView.name,
                  config: newView.config,
                })
                  .then(() => refetchViews())
                  .catch(handleError);
              }
            }}
            extraFilters={extraFilters}
            onExtraFiltersChange={setExtraFilters}
            onDropdownClick={(val) => {
              if (val === "viewConfig") {
                if (selectedView) {
                  updateView({
                    id: selectedView.id,
                    name: selectedView.name,
                    config: {
                      ...currentViewState,
                      filters: selectedView.config.filters,
                    },
                  })
                    .then(() => refetchViews())
                    .then(() => {
                      toast({
                        title: "View config saved successfully",
                      });
                    })
                    .catch(handleError);
                }
              } else if (val === "duplicate") {
                if (selectedView) {
                  const newViewName = `${selectedView.name} (Copy)`;
                  createView({
                    name: newViewName,
                    config: selectedView.config,
                    entityTypeId: seenWithEntity?.type,
                  })
                    .then(() => refetchViews())
                    .then(() => {
                      toast({
                        title: "View created successfully",
                      });
                    })
                    .catch(handleError);
                }
              } else if (val === "delete") {
                if (selectedView) {
                  deleteView({ id: selectedView.id })
                    .then(() => refetchViews())
                    .then(() => {
                      toast({
                        title: "View deleted successfully",
                      });
                    })
                    .catch(handleError);
                }
              }
            }}
            renderRightItems={() => {
              return (
                <div className="flex items-center gap-2">
                  {currentViewState.type === "list" ? (
                    <DataTableViewOptions table={table} />
                  ) : (
                    isMd && (
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          setIsEditing((prev) => !prev);
                        }}
                      >
                        {isEditing ? "Done" : "Edit Grid"}
                      </Button>
                    )
                  )}

                  <Tabs
                    value={currentViewState?.type}
                    onValueChange={(newType) => {
                      setCurrentViewState((prev) => {
                        return {
                          ...prev,
                          type: newType as "grid" | "list",
                        };
                      });
                    }}
                  >
                    <TabsList className="p-1 flex h-auto">
                      <TabsTrigger className="px-2" value="grid">
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </TabsTrigger>
                      <TabsTrigger className="px-2" value="list">
                        <List className="h-3.5 w-3.5" />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              );
            }}
          />
        </div>
        <div className="w-full pr-8">
          {entityBins ? (
            <ZoomBarChart
              className="h-48"
              // tooltipOrder="byValue"
              data={
                entityBins?.bins
                  ? Object.entries(entityBins.bins).map(([time, labels]) => ({
                      date: new Date(time).toISOString(),
                      time,
                      ...labels,
                    }))
                  : []
              }
              // maxValue={maxYValue}
              formatXAxis={(date) => format(new Date(date), "MMM d")}
              formatTooltip={(date) => {
                return `${format(new Date(date), "MMM d, h a")} - ${format(
                  addHours(new Date(date), CHART_INTERVAL_HOURS),
                  "MMM d, h a"
                )}`;
              }}
              xAxisSelection={xAxisSelection}
              onXAxisSelect={([start, end]) => {
                setSeenFilter((prev) => {
                  return {
                    type: EntityFilterType.Seen as const,
                    data: {
                      from: new Date(start),
                      to: addHours(new Date(end), CHART_INTERVAL_HOURS),
                    },
                  };
                });
              }}
              index="date"
              categories={entityBins?.labels ?? []}
              valueFormatter={(value) => {
                return Intl.NumberFormat("us").format(value).toString();
              }}
            />
          ) : (
            <div className="h-48 w-full px-8 py-4 pt-12">
              <Skeleton className="h-full w-full bg-gray-50"></Skeleton>
            </div>
          )}
        </div>

        <button
          className={cn({
            "flex justify-center w-full transition py-0.5": true,
            "hover:to-gray-200/50 bg-gradient-to-b from-white to-gray-100/60":
              !isChartSelectorOpen,
            "border-b": isChartSelectorOpen,
          })}
          onClick={() => {
            setIsChartSelectorOpen((prev) => !prev);
          }}
        >
          <ChevronDown
            className={cn({
              "transform rotate-180": isChartSelectorOpen,
              "h-5 w-5 transition-transform": true,
            })}
          />
        </button>

        <div className="relative grow w-full overflow-hidden">
          <ScrollArea
            // style={{
            //   transition: "height 1s",
            // }}
            className={cn({
              "w-full top-0 z-20 transition-all bg-background pr-8": true,
              "h-0": !isChartSelectorOpen,
              "h-full": isChartSelectorOpen,
            })}
          >
            <div className="overflow-y-auto min-h-full flex flex-col gap-2">
              <EntityViewContainer
                seenFilter={seenFilter}
                onSeenFilterChange={setSeenFilter}
                seenWithEntity={seenWithEntity}
                excludeViewId={selectedViewId}
              />
            </div>
          </ScrollArea>
          <div className="h-full px-2 md:px-8 py-2 md:py-4">
            {currentViewState.type === "grid" ? (
              <div className="space-y-4 w-full">
                <>
                  {(isEditing ? allEntities.slice(0, 8) : allEntities).map(
                    (entity) => {
                      return (
                        <EntityCard
                          key={`${entity.entityType}:${entity.entityId}`}
                          entity={entity}
                          entityNameMap={entityNameMap}
                          featureOrder={
                            currentViewState.gridConfig?.featureOrder ?? []
                          }
                          onFeatureOrderChange={(newOrder) =>
                            setCurrentViewState((prev) => {
                              return {
                                ...prev,
                                gridConfig: {
                                  featureOrder: newOrder,
                                },
                              };
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
              </div>
            ) : (
              <div className="h-full overflow-y-auto">
                <DataTable
                  table={table}
                  loading={fetchingEntities || loadingViews}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EntityViewContainer({
  seenFilter,
  onSeenFilterChange,
  excludeViewId,
  seenWithEntity,
}: {
  seenFilter?: SeenFilter;
  onSeenFilterChange?: (
    updater: SetStateAction<SeenFilter | undefined>
  ) => void;
  excludeViewId?: string;
  seenWithEntity?: Entity;
}) {
  const { data: views } = api.entityViews.list.useQuery(
    { entityTypeId: seenWithEntity?.type ?? null },
    // { entityTypeId: null },
    { refetchOnWindowFocus: false, staleTime: Infinity }
  );

  if (!views) return <div>Loading...</div>;

  return (
    <>
      {views.map((view) => (
        <EntityViewChart
          key={view.id}
          view={view}
          seenFilter={seenFilter}
          onSeenFilterChange={onSeenFilterChange}
          excludeViewId={excludeViewId}
          seenWithEntity={seenWithEntity}
        />
      ))}
    </>
  );
}

const EntityViewChart = ({
  view,
  seenFilter,
  onSeenFilterChange,
  excludeViewId,
  seenWithEntity,
}: {
  view: EntityView;
  seenFilter?: SeenFilter;
  onSeenFilterChange?: (
    updater: SetStateAction<SeenFilter | undefined>
  ) => void;
  excludeViewId?: string;
  seenWithEntity?: Entity;
}) => {
  const { entityFiltersToText } = useEntityFiltersToText();

  const binQueryProps = useMemo(() => {
    const onlyTypeFilters = getEntityFiltersOfType(
      view.config.filters,
      EntityFilterType.EntityType
    );
    const onlyTypeFiltersLabel = entityFiltersToText(onlyTypeFilters);

    const label = entityFiltersToText(view.config.filters);

    const addEntityFilter = (filters: EntityFilter[]) => {
      return [
        ...(filters ?? []),
        ...(view.entityTypeId === seenWithEntity?.type
          ? [
              {
                type: EntityFilterType.SeenWithEntity as const,
                data: seenWithEntity,
              },
            ]
          : []),
      ];
    };

    return {
      start: START_DATE,
      end: END_DATE,
      charts: [
        {
          entityFilters: addEntityFilter(view.config.filters),
          label: label,
        },
        // {
        //   entityFilters: addEntityFilter(onlyTypeFilters),
        //   label: onlyTypeFiltersLabel,
        // },
      ],
    };
  }, [entityFiltersToText, seenWithEntity, view.config.filters]);

  const { data: entityBins } =
    api.charts.getEntityTimeData.useQuery(binQueryProps);

  const xAxisSelection: [string, string] | undefined = useMemo(() => {
    const x1 = seenFilter?.data.from;
    const x2 = seenFilter?.data.to;
    return x1 && x2
      ? [x1.toISOString(), subHours(x2, CHART_INTERVAL_HOURS).toISOString()]
      : undefined;
  }, [seenFilter?.data.from, seenFilter?.data.to]);

  const chartData = useMemo(
    () =>
      entityBins?.bins
        ? Object.entries(entityBins.bins).map(([time, labels]) => ({
            date: new Date(time).toISOString(),
            time,
            ...labels,
          }))
        : [],
    [entityBins]
  );

  if (excludeViewId && view.id === excludeViewId) {
    return null;
  }

  return (
    <div className="h-36 relative">
      {entityBins ? (
        <>
          <ZoomBarChart
            colors={["blue", "sky"]}
            className="h-full"
            data={chartData}
            xAxisSelection={xAxisSelection}
            onXAxisSelect={(selectedRange: [string, string]) => {
              onSeenFilterChange?.(() => ({
                type: EntityFilterType.Seen,
                data: {
                  from: new Date(selectedRange[0]),
                  to: addHours(
                    new Date(selectedRange[1]),
                    CHART_INTERVAL_HOURS
                  ),
                },
              }));
            }}
            stack={true}
            // showXAxis={idx === entityBins.labels.length - 1}
            // tooltipOrder="byValue"
            formatXAxis={(date) => format(new Date(date), "MMM d")}
            formatTooltip={(date) => {
              return `${format(new Date(date), "MMM d, h a")} - ${format(
                addHours(new Date(date), CHART_INTERVAL_HOURS),
                "MMM d, h a"
              )}`;
            }}
            categories={entityBins.labels}
            index="date"
            valueFormatter={(value) => {
              return Intl.NumberFormat("us").format(value).toString();
            }}
          />
          <div className="top-2 left-[3.8rem] absolute text-foreground font-medium text-md">
            {view.name}{" "}
            <Link href={`/find?view=${view.id}`}>
              <ExternalLinkIcon className="h-3.5 w-3.5 text-muted-foreground inline" />
            </Link>
          </div>
        </>
      ) : (
        <Skeleton className="h-full w-full bg-gray-50"></Skeleton>
      )}
    </div>
  );
};

export function EditEntityView(props: {
  allViews: EntityView[];

  view: EntityView | undefined;
  onViewChange: (value: EntityView) => void;

  extraFilters?: EntityFilter[];
  onExtraFiltersChange?: (filters: EntityFilter[]) => void;

  onDropdownClick?: (dropdownValue: string) => void;

  renderRightItems?: () => React.ReactNode;
}) {
  const {
    allViews,
    view: initState,
    onViewChange,
    extraFilters,
    onExtraFiltersChange,
    renderRightItems,
    onDropdownClick,
  } = props;

  const router = useRouter();

  const [editState, setEditState] = useState<EntityView | undefined>(initState);

  const resetState = useCallback(() => {
    setEditState(initState);
  }, [initState]);

  useEffect(() => {
    resetState();
  }, [resetState]);

  const [isEditing, setIsEditing] = useState(false);

  const allFilters = useMemo(() => {
    return [
      ...(editState?.config?.filters ?? []),
      ...(extraFilters ?? []),
    ] as EntityFilter[];
  }, [editState, extraFilters]);

  const { isMd } = useBreakpoint("md");

  const renderEntityFilters = () => {
    return (
      <div className="flex items-center flex-wrap">
        {initState && (
          <>
            {/* <div className="self-stretch w-0.5 shrink-0 bg-accent"></div> */}
            <RenderEntityFilters
              filters={editState?.config?.filters ?? []}
              onFiltersChange={(filters) => {
                setEditState((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    config: { ...prev.config, filters },
                  };
                });
              }}
              editable={isEditing}
              renderWrapper={(children, idx) => {
                return <div className="opacity-80">{children}</div>;
              }}
            />
            {isEditing && (
              <div className="self-stretch flex items-center bg-accent pl-1">
                <EditEntityFilters
                  value={editState?.config?.filters ?? []}
                  onChange={(filters) => {
                    setEditState((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        config: { ...prev.config, filters },
                      };
                    });
                  }}
                />
              </div>
            )}

            {/* <div className="bg-accent -skew-x-[17deg] w-3 -translate-x-1 self-stretch -z-10"></div> */}
          </>
        )}
        {isEditing ? null : (
          <>
            <RenderEntityFilters
              filters={extraFilters ?? []}
              onFiltersChange={(filters) => {
                onExtraFiltersChange?.(filters);
              }}
              editable={!isEditing}
              renderWrapper={(children, idx) => {
                return (
                  <div
                    className={cn({
                      "pr-0 flex items-center self-stretch h-8": true,
                      "p-1": idx >= 0,
                    })}
                  >
                    {children}
                  </div>
                );
              }}
              renderPlaceholder={initState ? () => null : undefined}
            />

            <div className="px-1 self-stretch flex items-center">
              <EditEntityFilters
                existingFilters={allFilters}
                value={extraFilters ?? []}
                onChange={(filters) => {
                  onExtraFiltersChange?.(filters);
                }}
              />
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn({
        "flex flex-col flex-grow overflow-auto transition": true,
        "bg-muted": isEditing,
      })}
    >
      <div className="flex items-center h-14 px-4 md:px-8 border-b shrink-0">
        {isEditing ? (
          <div className="mr-4">
            <Input
              inputSize="md"
              value={editState?.name ?? ""}
              onChange={(e) => {
                setEditState((prev) => {
                  if (!prev) return prev;
                  return { ...prev, name: e.target.value };
                });
              }}
              className="max-w-sm font-bold"
            />
          </div>
        ) : (
          <div className="flex items-center">
            <div className="text-emphasis-foreground text-md">
              <ComboboxSelector
                disabled={isMd}
                value={initState?.id ?? null}
                options={allViews.map((view) => ({
                  value: view.id,
                  label: view.name,
                }))}
                renderTrigger={({ value }) => {
                  const view = allViews.find((v) => v.id === value);
                  return (
                    <div>
                      {view?.name ?? "All Entities"}
                      {!isMd && (
                        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground inline ml-1" />
                      )}
                    </div>
                  );
                }}
                onSelect={(value) => {
                  void router.push({
                    pathname: router.pathname,
                    query: { ...router.query, view: value },
                  });
                }}
              />
            </div>
            {initState && isMd && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild className="">
                  <Button size="iconXs" variant="link" className="shrink-0">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="start">
                  <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                    Edit filters
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onDropdownClick?.("duplicate")}
                  >
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onDropdownClick?.("viewConfig")}
                  >
                    Save view
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => onDropdownClick?.("delete")}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}

        {isMd && <div className="ml-4">{renderEntityFilters()}</div>}

        <div className="ml-auto">{!isEditing && renderRightItems?.()}</div>
      </div>
      {!isMd && <div className="px-4 py-1">{renderEntityFilters()}</div>}
      {isEditing ? (
        <div className="flex items-center justify-end w-full gap-2 px-8 py-2">
          <Button
            variant="outline"
            size="xs"
            onClick={() => {
              resetState();
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
          <Button
            size="xs"
            onClick={() => {
              if (editState) {
                onViewChange(editState);
              }
              setIsEditing(false);
            }}
          >
            Done
          </Button>
        </div>
      ) : null}
    </div>
  );
}

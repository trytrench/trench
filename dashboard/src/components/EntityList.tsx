import { type Entity, TypeName } from "event-processing";
import {
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
import { format } from "date-fns";
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

interface Props {
  seenWithEntity?: Entity;
}

type EntityView = RouterOutputs["entityViews"]["list"][number];

const DEFAULT_PAGINATION: PaginationState = {
  pageIndex: 0,
  pageSize: 50,
};

export function EntityList({ seenWithEntity }: Props) {
  const router = useRouter();
  const { toast } = useToast();

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  // const { viewConfig, setViewConfig } = useEntityViewConfig(seenWithEntity);

  const { mutateAsync: createView } = api.entityViews.create.useMutation();
  const { mutateAsync: updateView } = api.entityViews.update.useMutation();
  const { mutateAsync: deleteView } = api.entityViews.delete.useMutation();

  const { data: views, refetch: refetchViews } = api.entityViews.list.useQuery(
    {
      entityTypeId: seenWithEntity?.type ?? null,
    },
    {
      refetchOnWindowFocus: false,
      staleTime: Infinity,
    }
  );

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

  const allFilters = useMemo(() => {
    const filters: EntityFilter[] = [];
    if (viewConfig) {
      filters.push(...viewConfig.filters);
    }
    filters.push(...currentViewState.filters);
    if (seenWithEntity) {
      filters.push({
        type: EntityFilterType.SeenWithEntity,
        data: seenWithEntity,
      });
    }
    return filters;
  }, [viewConfig, currentViewState.filters, seenWithEntity]);

  const queryProps: RouterInputs["lists"]["getEntitiesList"] = useMemo(() => {
    return {
      entityFilters: allFilters,
      limit: pagination.pageSize,
      cursor: pagination.pageIndex * pagination.pageSize,
    };
  }, [allFilters, pagination.pageSize, pagination.pageIndex]);

  const { data: entities, isFetching: fetchingEntities } =
    api.lists.getEntitiesList.useQuery(queryProps, {
      keepPreviousData: true,
      staleTime: 15000,
    });

  const { data: features } = api.features.list.useQuery();

  const filteredFeatures = useMemo(() => {
    const entType =
      allFilters.find((filt) => filt.type === EntityFilterType.EntityType)
        ?.data ?? null;
    return features?.filter((feature) => feature.entityTypeId === entType);
  }, [allFilters, features]);

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
                <div
                // className={cn({
                //   "text-right":
                //     value.result.type === "success" &&
                //     (value.result.data.schema.type === TypeName.Float64 ||
                //       value.result.data.schema.type === TypeName.Int64),
                // })}
                >
                  <RenderResult result={value.result} />
                </div>
              ) : null;
            },
          }) as ColumnDef<EntityData>
      ) ?? []),
    ],
    [entityTypes, filteredFeatures]
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

  return (
    <div className="h-full flex">
      <div className="w-64 border-r shrink-0 pt-4 px-6 h-full">
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
      </div>
      <div className="h-full grow overflow-auto flex flex-col">
        <div className="shrink-0">
          <EditEntityView
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
            extraFilters={currentViewState.filters}
            onExtraFiltersChange={(filters) => {
              setCurrentViewState((prev) => {
                return {
                  ...prev,
                  filters,
                };
              });
            }}
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
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => {
                        setIsEditing((prev) => !prev);
                      }}
                    >
                      {isEditing ? "Done" : "Edit Grid"}
                    </Button>
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
        <div className="grow overflow-y-auto">
          {currentViewState.type === "grid" ? (
            <ScrollArea className="h-full">
              <div className="space-y-4 px-8 py-4">
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
            </ScrollArea>
          ) : (
            <div className="h-full py-4 px-8 overflow-y-auto">
              <DataTable table={table} loading={fetchingEntities} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EditEntityView(props: {
  view: EntityView | undefined;
  onViewChange: (value: EntityView) => void;

  extraFilters?: EntityFilter[];
  onExtraFiltersChange?: (filters: EntityFilter[]) => void;

  onDropdownClick?: (dropdownValue: string) => void;

  renderRightItems?: () => React.ReactNode;
}) {
  const {
    view: initState,
    onViewChange,
    extraFilters,
    onExtraFiltersChange,
    renderRightItems,
    onDropdownClick,
  } = props;

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

  return (
    <div
      className={cn({
        "flex flex-col flex-grow overflow-auto transition": true,
        "bg-muted": isEditing,
      })}
    >
      <div className="flex items-center h-14 px-8 border-b shrink-0">
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
        ) : initState ? (
          <>
            <div className="text-emphasis-foreground text-md">
              {initState.name}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="mr-4">
                <Button size="iconXs" variant="link" className="shrink-0">
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setIsEditing(true)}>
                  Edit filters
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onDropdownClick?.("viewConfig")}
                >
                  Save view
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDropdownClick?.("delete")}>
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}

        <div className="flex items-center flex-wrap z-0">
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

        <div className="ml-auto">{!isEditing && renderRightItems?.()}</div>
      </div>
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

import { ColumnDef } from "@tanstack/react-table";
import clsx from "clsx";
import { format } from "date-fns";
import { TypeName } from "event-processing";
import { LayoutGrid, List, Loader2Icon, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { EntityCard } from "~/components/EntityCard";
import { Button } from "~/components/ui/button";
import { SpinnerButton } from "~/components/ui/custom/spinner-button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useEntityNameMap } from "~/hooks/useEntityNameMap";
import { handleError } from "~/lib/handleError";
import { EntityFilters } from "~/shared/validation";
import { RouterOutputs, api } from "~/utils/api";
import { EditEntityFilters } from "../components/filters/EditEntityFilters";
import { EditViewDialog } from "./EditViewDialog";
import { RenderResult } from "./RenderResult";
import { Checkbox } from "./ui/checkbox";
import { DataTable, useDataTableState } from "./ui/data-table";
import { DataTableViewOptions } from "./ui/data-table-view-options";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Toggle } from "./ui/toggle";

interface Props {
  seenWithEntityId?: string;
}

export const EntityList = ({ seenWithEntityId }: Props) => {
  const router = useRouter();
  const [viewType, setViewType] = useState<"grid" | "list">("grid");

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const [filters, setFilters] = useState<EntityFilters>({
    seenWithEntityId,
  });

  // Query must be for an entity type
  useEffect(() => {
    if (entityTypes && !filters.entityType)
      setFilters({
        ...filters,
        entityType: entityTypes?.[0]?.id,
      });
  }, [entityTypes, filters]);

  const { data: views, refetch: refetchViews } =
    api.entityViews.list.useQuery();

  const { mutateAsync: createView } = api.entityViews.create.useMutation();
  const { mutateAsync: updateView } = api.entityViews.update.useMutation();
  const { mutateAsync: deleteView } = api.entityViews.delete.useMutation();

  const limit = 10;

  const { data: features } = api.features.list.useQuery();
  const filteredFeatures = useMemo(
    () =>
      features?.filter(
        (feature) => feature.entityTypeId === filters.entityType
      ),
    [features, filters.entityType]
  );

  const columns: ColumnDef<
    RouterOutputs["lists"]["getEntitiesList"]["rows"][number]
  >[] = useMemo(
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
      ...((filteredFeatures?.map((feature) => ({
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
      })) ?? []) as ColumnDef<
        RouterOutputs["lists"]["getEntitiesList"]["rows"][number]
      >[]),
    ],
    [filteredFeatures]
  );

  const { columnVisibility, setColumnVisibility, columnOrder, setColumnOrder } =
    useDataTableState({
      columnVisibility: {},
      columnOrder: columns.map((column) => column.id ?? "").filter(Boolean),
    });

  const currentView = useMemo(
    () => views?.find((view) => view.id === router.query.view) ?? null,
    [views, router.query.view]
  );

  useEffect(() => {
    if (currentView) {
      setFilters(currentView.config.filters);
      setViewType(currentView.config.type);
      if (
        currentView.config.columnOrder &&
        currentView.config.columnVisibility
      ) {
        setColumnOrder(currentView.config.columnOrder);
        setColumnVisibility(currentView.config.columnVisibility);
      }
    }
  }, [currentView, router.query.view, setColumnOrder, setColumnVisibility]);

  const {
    data: entities,
    isLoading: entitiesLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = api.lists.getEntitiesList.useInfiniteQuery(
    {
      entityFilters: filters,
      // sortBy,
      // limit,
    },
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.rows.length < limit) return undefined;
        return pages.length * limit;
      },
      enabled: !!filters.entityType,
    }
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

  useEffect(() => {
    if (!views)
      setColumnOrder(columns.map((column) => column.id ?? "").filter(Boolean));
  }, [columns, setColumnOrder, views]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex p-3 px-8 border-b items-center">
        <EditEntityFilters value={filters} onChange={setFilters} />

        <div className="flex gap-1">
          <Toggle
            className="h-6 flex items-center"
            onClick={() => setViewType("grid")}
            pressed={viewType === "grid"}
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            <span className="text-xs">Grid</span>
          </Toggle>
          <Toggle
            className="h-6 flex items-center"
            onClick={() => setViewType("list")}
            pressed={viewType === "list"}
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
                if (currentView) {
                  updateView({
                    id: currentView.id,
                    config: {
                      filters,
                      type: viewType,
                      columnOrder,
                      columnVisibility,
                    },
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
                createView({
                  name: values.name,
                  config: {
                    filters: filters,
                    type: viewType,
                    columnOrder,
                    columnVisibility,
                  },
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
              onClick={() => router.push(`?view=${view.id}`)}
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
                      if (currentView) {
                        updateView({
                          id: currentView.id,
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
                      if (currentView) {
                        deleteView({ id: currentView.id })
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

        {viewType === "grid" ? (
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
          <div className="px-8 overflow-x-auto flex-1">
            <DataTable
              columns={columns}
              data={allEntities}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              columnOrder={columnOrder}
              onColumnOrderChange={setColumnOrder}
              loading={entitiesLoading}
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
                      (table.getColumn("Name")?.getFilterValue() as string) ??
                      ""
                    }
                    onChange={(event) =>
                      table
                        .getColumn("Name")
                        ?.setFilterValue(event.target.value)
                    }
                    className="max-w-sm"
                  />
                  <DataTableViewOptions table={table} />
                </>
              )}
            />
          </div>
        )}

        <div className="absolute bottom-0 left-0 h-8 w-full bg-gradient-to-t from-background pointer-events-none"></div>
      </div>
    </div>
  );
};

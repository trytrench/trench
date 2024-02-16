import { zodResolver } from "@hookform/resolvers/zod";
import clsx from "clsx";
import { Entity, TypeName } from "event-processing";
import { LayoutGrid, List, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EntityCard } from "~/components/EntityCard";
import { Button } from "~/components/ui/button";
import { SpinnerButton } from "~/components/ui/custom/spinner-button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useEntityNameMap } from "~/hooks/useEntityNameMap";
import { EntityFilters } from "~/shared/validation";
import { RouterOutputs, api } from "~/utils/api";
import {
  EditEntityFilters,
  useEntityFilters,
} from "../components/filters/EditEntityFilters";
import { DataTable, useDataTableState } from "./ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "./ui/checkbox";
import { format } from "date-fns";
import { DataTableViewOptions } from "./ui/data-table-view-options";
import { RenderResult } from "./RenderResult";
import { Toggle } from "./ui/toggle";
import { customEncodeURIComponent } from "../lib/uri";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
});

interface Props {
  seenWithEntity?: Entity;
}

export const EntityList = ({ seenWithEntity }: Props) => {
  const router = useRouter();
  const [viewType, setViewType] = useState<"grid" | "list">("grid");

  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const seenWithEntityTypeName = entityTypes?.find(
    (et) => et.id === seenWithEntity?.type
  )?.type;

  const { value: filters, onChange: setFilters } = useEntityFilters();

  // Query must be for an entity type
  // useEffect(() => {
  //   if (entityTypes && !filters.entityType)
  //     setFilters({
  //       ...filters,
  //       // entityType: entityTypes?.[0]?.id,
  //     });
  // }, [entityTypes, filters]);

  const { data: views, refetch: refetchViews } =
    api.entityViews.list.useQuery();

  const { mutateAsync: createView } = api.entityViews.create.useMutation();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

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
      setViewType(currentView.config.viewType);
      setColumnOrder(currentView.config.columnOrder);
      setColumnVisibility(currentView.config.columnVisibility);
    }
  }, [
    currentView,
    router.query.view,
    setColumnOrder,
    setColumnVisibility,
    setFilters,
  ]);

  const {
    data: entities,
    isLoading: entitiesLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
  } = api.lists.getEntitiesList.useInfiniteQuery(
    {
      entityFilters: {
        ...filters,
        seenWithEntity: seenWithEntity,
      },
      // sortBy,
      // limit,
    },
    {
      getNextPageParam: (lastPage, pages) => {
        if (lastPage.rows.length < limit) return undefined;
        return pages.length * limit;
      },
      // enabled: !!filters.entityType,
    }
  );

  const allEntities = useMemo(() => {
    return entities?.pages.flatMap((page) => page.rows) ?? [];
  }, [entities]);

  const entityIds = useMemo<string[]>(() => {
    return allEntities.flatMap((entity) => {
      return (
        entity.features
          .filter(
            (feature) =>
              feature.result.type === "success" &&
              feature.result.data.schema.type === TypeName.Entity
          )
          .map((feature) => feature.result.data!.value.id) ?? []
      );
    });
  }, [allEntities]);
  const entityNameMap = useEntityNameMap(entityIds);

  const [open, setOpen] = useState(false);
  function onSubmit(values: z.infer<typeof formSchema>) {
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
        setOpen(false);
        return refetchViews();
      })
      .catch((error) => {
        console.error(error);
      });
  }

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
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="xs" variant="outline">
              Save
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create view</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem className="col-span-3">
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Save</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="flex h-full">
        <div className="w-64 border-r shrink-0 space-y-1 pt-4 px-6">
          <div className="text-sm font-medium text-emphasis-foreground">
            Views
          </div>
          {views?.map((view) => (
            <Link
              href={
                seenWithEntity
                  ? `/entity/${customEncodeURIComponent(
                      seenWithEntityTypeName
                    )}/${customEncodeURIComponent(
                      seenWithEntity?.id
                    )}?${new URLSearchParams({
                      tab: router.query.tab as string,
                      view: view.id,
                    }).toString()}`
                  : `?view=${view.id}`
              }
              key={view.id}
              className={clsx(
                "px-4 py-1 w-full text-sm text-muted-foreground text-left rounded-md transition flex justify-between items-center hover:bg-muted",
                {
                  "bg-accent text-accent-foreground":
                    router.query.view === view.id,
                }
              )}
            >
              {view.name}
            </Link>
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

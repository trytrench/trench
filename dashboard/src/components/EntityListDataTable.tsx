import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { FeatureDef } from "event-processing";
import { useEffect, useMemo } from "react";
import { Input } from "~/components/ui/input";
import { RouterOutputs, api } from "~/utils/api";
import { RenderResult } from "./RenderResult";
import { Checkbox } from "./ui/checkbox";
import { DataTable, useDataTableState } from "./ui/data-table";
import { DataTableViewOptions } from "./ui/data-table-view-options";
import { EntityViewConfig } from "~/shared/validation";
import { useRouter } from "next/router";

type EntityData = RouterOutputs["lists"]["getEntitiesList"]["rows"][number];

interface Props {
  features: FeatureDef[];
  entities: EntityData[];
  config: Exclude<EntityViewConfig["tableConfig"], undefined>;
  onConfigChange: (
    config: Exclude<EntityViewConfig["tableConfig"], undefined>
  ) => void;
  loading?: boolean;
}

export const EntityListDataTable = ({
  features,
  entities,
  onConfigChange,
  config,
  loading,
}: Props) => {
  const router = useRouter();
  const { data: entityTypes } = api.entityTypes.list.useQuery();

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
      ...features.map(
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
      ),
    ],
    [features]
  );

  // If config hasn't been set or the entity type changed, set it to the default
  useEffect(() => {
    if (
      !config.columnOrder.length ||
      config.columnOrder.some((column) => !columns.some((c) => c.id === column))
    ) {
      onConfigChange({
        columnOrder: columns.map((column) => column.id ?? "").filter(Boolean),
        columnVisibility: config.columnVisibility,
      });
    }
  }, [config, columns, onConfigChange]);

  return (
    <div className="px-8 overflow-x-auto h-full">
      <DataTable
        columns={columns}
        data={entities}
        columnVisibility={config.columnVisibility}
        onColumnVisibilityChange={(updater) => {
          onConfigChange({
            ...config,
            columnVisibility:
              typeof updater === "function"
                ? updater(config.columnVisibility)
                : updater,
          });
        }}
        columnOrder={config.columnOrder}
        onColumnOrderChange={(updater) => {
          onConfigChange({
            ...config,
            columnOrder:
              typeof updater === "function"
                ? updater(config.columnOrder)
                : updater,
          });
        }}
        loading={loading}
        onRowClick={(entity) =>
          router.push(
            `/entity/${entityTypes?.find((et) => et.id === entity.entityType)
              ?.type}/${entity.entityId}`
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
  );
};

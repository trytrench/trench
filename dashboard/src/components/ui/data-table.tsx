import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type Table as TableType,
  type VisibilityState,
  type ColumnOrderState,
  type OnChangeFn,
} from "@tanstack/react-table";
import * as React from "react";
import { DataTablePagination } from "./data-table-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import clsx from "clsx";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { Skeleton } from "./skeleton";
import { cn } from "../../lib/utils";

interface DataTableProps<TData, TValue> {
  renderHeader?: (table: TableType<TData>) => React.ReactNode;
  onRowClick?: (row: TData) => void;
  loading?: boolean;
  table: TableType<TData>;
}

export const useDataTableState = ({
  columnVisibility: initialColumnVisibility,
  columnOrder: initialColumnOrder,
}: {
  columnVisibility: VisibilityState;
  columnOrder: ColumnOrderState;
}) => {
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialColumnVisibility);
  const [columnOrder, setColumnOrder] =
    React.useState<ColumnOrderState>(initialColumnOrder);

  return {
    columnVisibility,
    setColumnVisibility,
    columnOrder,
    setColumnOrder,
  };
};

const SortableTableHead = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <TableHead ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </TableHead>
  );
};

export function DataTable<TData, TValue>({
  renderHeader,
  onRowClick,
  loading = false,
  table,
}: DataTableProps<TData, TValue>) {
  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const colOrder = table.getState().columnOrder;
        const oldIndex = colOrder.indexOf(active.id as string);
        const newIndex = colOrder.indexOf(over.id as string);

        table.setColumnOrder(arrayMove(colOrder, oldIndex, newIndex));
      }
    },
    [table]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="relative flex flex-col h-full w-full">
      <div className="flex items-center py-4">{renderHeader?.(table)}</div>
      <div className="relative rounded-md border grow overflow-hidden">
        <Table
          className="relative overflow-auto h-full"
          parentClassName="h-full"
        >
          <TableHeader
            className="sticky top-0 bg-white shrink-0 z-10 [&_tr]:border-b-0"
            style={{
              boxShadow: "inset 0 -1px 0 rgba(0, 0, 0, 0.1)",
            }}
          >
            {table.getHeaderGroups().map((headerGroup, idx) => (
              <TableRow
                key={headerGroup.id}
                className={cn({
                  "border-b-0": idx === table.getHeaderGroups().length - 1,
                })}
              >
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToHorizontalAxis]}
                >
                  <SortableContext
                    items={table.getState().columnOrder}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => {
                      return (
                        <SortableTableHead key={header.id} id={header.id}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </SortableTableHead>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </TableRow>
            ))}
          </TableHeader>
          <TableBody className="overflow-y-auto">
            {loading ? (
              Array.from({
                length: table.getPaginationRowModel().rows.length,
              }).map((_, index) => (
                <TableRow key={index}>
                  {table.getAllColumns().map((column) => (
                    <TableCell key={column.id}>
                      <Skeleton className="h-[20px]" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={clsx({
                    "hover:cursor-pointer": onRowClick,
                  })}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="truncate max-w-md">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="py-2">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}

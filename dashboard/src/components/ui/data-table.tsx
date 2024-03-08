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
  HeaderGroup,
  Row,
  Header,
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
  useDndContext,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { Skeleton } from "./skeleton";
import { cn } from "../../lib/utils";
import { useMemo } from "react";

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

const SortableTableHead = <TData, TValue>({
  header,
  children,
  table,
}: {
  header: Header<TData, TValue>;
  table: TableType<TData>;
  children: React.ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: header.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <TableHead ref={setNodeRef} style={style} {...attributes}>
      <div className="flex items-center justify-between h-full group">
        <div {...listeners} className="grow h-full flex items-center px-4">
          {children}
        </div>
        <div
          onDoubleClick={() => header.column.resetSize()}
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            header.getResizeHandler()(e);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            e.preventDefault();
            header.getResizeHandler()(e);
          }}
          className="w-1 h-full cursor-col-resize shrink-0 group-hover:bg-gray-200 transition"
          style={{
            transform:
              table.options.columnResizeMode === "onEnd" &&
              header.column.getIsResizing()
                ? `translateX(${
                    1 * (table.getState().columnSizingInfo.deltaOffset ?? 0)
                  }px)`
                : "",
          }}
        ></div>
      </div>
    </TableHead>
  );
};

function SortedTableCells<TData>({
  row,
  table,
}: {
  row: Row<TData>;
  table: TableType<TData>;
}) {
  const { over, active } = useDndContext();

  const sortedRows = useMemo(() => {
    const visibleCells = row.getVisibleCells();
    if (!over?.id || !active?.id) {
      return visibleCells;
    }
    const colOrder = table.getState().columnOrder;

    const oldIndex = colOrder.indexOf(active.id.toString());
    const newIndex = colOrder.indexOf(over.id.toString());

    const actualColOrder = arrayMove(colOrder, oldIndex, newIndex);
    const sorted = actualColOrder.map((id) => {
      return visibleCells.find((cell) => cell.column.id === id)!;
    });
    return sorted;
  }, [active?.id, row, over?.id, table]);

  return (
    <>
      {sortedRows.map((cell) => {
        return (
          <TableCell key={cell.id} className="truncate max-w-md">
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        );
      })}
    </>
  );
}

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
    <div className="relative flex flex-col h-full w-full overflow-auto">
      <div>{renderHeader?.(table)}</div>
      <div className="relative rounded-md border grow overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis]}
        >
          <Table
            className="relative overflow-auto max-h-full"
            parentClassName="h-full"
            style={{
              flexShrink: 0,
              width: table.getCenterTotalSize(),
              minWidth: table.getCenterTotalSize(),
              maxWidth: table.getCenterTotalSize(),
            }}
          >
            <TableHeader
              className="sticky top-0 bg-background shrink-0 z-10 [&_tr]:border-b-0"
              style={{
                boxShadow: "inset 0 -1px 0 rgba(0, 0, 0, 0.1)",
              }}
            >
              {table.getHeaderGroups().map((headerGroup, idx) => (
                <TableRow
                  key={headerGroup.id}
                  className={cn({
                    // "border-b-0": idx === table.getHeaderGroups().length - 1,
                  })}
                >
                  <SortableContext
                    items={table.getState().columnOrder}
                    strategy={horizontalListSortingStrategy}
                  >
                    {headerGroup.headers.map((header) => {
                      return (
                        <SortableTableHead
                          key={header.id}
                          header={header}
                          table={table}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, {
                                ...header.getContext(),
                                style: {
                                  width: header.getSize(),
                                  minWidth: header.getSize(),
                                  maxWidth: header.getSize(),
                                  flexShrink: 0,
                                },
                              })}
                        </SortableTableHead>
                      );
                    })}
                  </SortableContext>
                </TableRow>
              ))}
            </TableHeader>
            <TableBody className="overflow-y-auto bg-background">
              {loading ? (
                Array.from({
                  length: table.getState().pagination.pageSize,
                }).map((_, index) => (
                  <TableRow key={index}>
                    {table.getVisibleLeafColumns().map((column) => (
                      <TableCell
                        key={column.id}
                        style={{
                          width: column.getSize(),
                          minWidth: column.getSize(),
                          maxWidth: column.getSize(),
                        }}
                      >
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
                    {row.getVisibleCells().map((cell) => {
                      return (
                        <TableCell
                          key={cell.id}
                          className="truncate shrink-0"
                          style={{
                            width: cell.column.getSize(),
                            minWidth: cell.column.getSize(),
                            maxWidth: cell.column.getSize(),
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      );
                    })}
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
        </DndContext>
      </div>
      <div className="py-2">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}

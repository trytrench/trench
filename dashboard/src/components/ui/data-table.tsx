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

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  renderHeader?: (table: TableType<TData>) => React.ReactNode;
  onRowClick?: (row: TData) => void;
  columnVisibility: VisibilityState;
  onColumnVisibilityChange: OnChangeFn<VisibilityState>;
  columnOrder: ColumnOrderState;
  onColumnOrderChange: OnChangeFn<ColumnOrderState>;
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
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <TableHead ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </TableHead>
  );
};

export function DataTable<TData, TValue>({
  columns,
  data,
  renderHeader,
  onRowClick,
  columnVisibility,
  onColumnVisibilityChange,
  columnOrder,
  onColumnOrderChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    onColumnOrderChange,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      columnOrder,
    },
  });

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = columnOrder.indexOf(active.id as string);
        const newIndex = columnOrder.indexOf(over.id as string);

        onColumnOrderChange(arrayMove(columnOrder, oldIndex, newIndex));
      }
    },
    [onColumnOrderChange, columnOrder]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div>
      <div className="flex items-center py-4">{renderHeader?.(table)}</div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToHorizontalAxis]}
                >
                  <SortableContext
                    items={columnOrder}
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
          <TableBody>
            {table.getRowModel().rows?.length ? (
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
                    <TableCell key={cell.id} className="truncate">
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
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="py-4">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}

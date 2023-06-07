import { Box, Link, Table, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  type OnChangeFn,
  type PaginationState,
  type Row,
  type RowSelectionState,
} from "@tanstack/react-table";
import * as React from "react";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableViewOptions } from "./DataTableViewOptions";
import NextLink from "next/link";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onPaginationChange: OnChangeFn<PaginationState>;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  header?: React.ReactNode;
  getRowHref?: (row: Row<TData>) => string;
  showColumnVisibilityOptions?: boolean;
  showPagination?: boolean;

  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;

  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onPaginationChange,
  pageCount,
  pageIndex,
  pageSize,
  header,
  getRowHref,
  showColumnVisibilityOptions = false,
  showPagination = true,
  rowSelection = {},
  onRowSelectionChange,
  getRowId,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const pagination = React.useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  );

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    // getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: onRowSelectionChange,
    onPaginationChange: (newVal) => {
      onPaginationChange(newVal);
      onRowSelectionChange?.({});
    },
    getRowId: getRowId,
    pageCount,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  return (
    <Box w="full">
      {(header || showColumnVisibilityOptions) && (
        <Box display="flex" alignItems="center" py={4}>
          {header}
          {showColumnVisibilityOptions && (
            <DataTableViewOptions table={table} />
          )}
        </Box>
      )}
      <Box borderRadius="md" borderWidth="1px" overflowX="auto">
        <Table>
          <Thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <Tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <Th
                      key={header.id}
                      maxW={header.getSize()}
                      fontSize="xs"
                      px={4}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </Th>
                  );
                })}
              </Tr>
            ))}
          </Thead>
          <Tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Tr
                  key={row.id}
                  _hover={{ bg: "gray.50" }}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <Td
                      fontSize="sm"
                      key={cell.id}
                      maxW={cell.column.getSize()}
                      isTruncated
                      py={2}
                      px={4}
                    >
                      {cell.column.columnDef.meta?.disableLink ||
                      !getRowHref ? (
                        flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )
                      ) : (
                        <NextLink href={getRowHref(row)} passHref>
                          <Link>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </Link>
                        </NextLink>
                      )}
                    </Td>
                  ))}
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan={columns.length} h="24" textAlign="center">
                  No results.
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>
      {showPagination && <DataTablePagination table={table} />}
    </Box>
  );
}

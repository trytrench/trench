import {
  Box,
  Link,
  Skeleton,
  Spinner,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
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
  onPaginationChange?: OnChangeFn<PaginationState>;
  pageCount?: number;
  pageIndex?: number;
  pageSize?: number;
  header?: React.ReactNode;
  getRowHref?: (row: Row<TData>) => string;
  showColumnVisibilityOptions?: boolean;
  showPagination?: boolean;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
  getRowId?: (originalRow: TData, index: number, parent?: Row<TData>) => string;
  isLoading?: boolean;
  rowHeight?: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  onPaginationChange,
  pageCount = 1,
  pageIndex = 0,
  pageSize = data.length,
  header,
  getRowHref,
  showColumnVisibilityOptions = false,
  showPagination = true,
  rowSelection = {},
  onRowSelectionChange,
  getRowId,
  isLoading = false,
  rowHeight,
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
      onPaginationChange?.(newVal);
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
      <Box borderRadius="md" borderWidth="1px" overflowX="scroll" px={1}>
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
                      px={3}
                      whiteSpace="nowrap"
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
            {isLoading ? (
              rowHeight ? (
                Array.from({ length: pageSize }).map((_, i) => (
                  <Tr height={rowHeight} key={i}>
                    {columns.map((column) => (
                      <Td
                        fontSize="sm"
                        key={column.id}
                        // maxW={column.getSize()}
                        isTruncated
                        py={1.5}
                        px={3}
                      >
                        <Skeleton
                          height="16px"
                          startColor="gray.100"
                          endColor="gray.300"
                        />
                      </Td>
                    ))}
                  </Tr>
                ))
              ) : (
                <Tr>
                  <Td colSpan={columns.length} h="24" textAlign="center">
                    <Spinner
                      thickness="4px"
                      speed="0.65s"
                      emptyColor="gray.200"
                      color="blue.500"
                      size="lg"
                    />
                  </Td>
                </Tr>
              )
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <Tr
                  height={rowHeight}
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
                      py={1.5}
                      px={3}
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

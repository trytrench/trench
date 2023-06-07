import {
  Box,
  Flex,
  Button,
  Select,
  Text,
  HStack,
  VisuallyHidden,
} from "@chakra-ui/react";
import type { Table } from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <Flex
      alignItems="center"
      justifyContent="space-between"
      p={2}
      pos="sticky"
      bottom={0}
      bgColor="white"
      borderTopWidth={1}
      mt="-1px"
      overflowX="auto"
    >
      <Text fontSize="sm" color="subtle">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </Text>
      <HStack alignItems="center" spacing={6}>
        <HStack alignItems="center" spacing={2}>
          <Text fontSize="sm" fontWeight="medium">
            Rows per page
          </Text>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onChange={(e) => {
              table.setPageSize(Number(e.target.value));
            }}
            size="sm"
            width="70px"
          >
            {[10, 20, 30, 40, 50].map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </Select>
        </HStack>
        <Box
          display="flex"
          alignItems="center"
          justifyContent="center"
          fontSize="sm"
          fontWeight="medium"
          width="100px"
        >
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </Box>
        <HStack alignItems="center" spacing={2}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            isDisabled={!table.getCanPreviousPage()}
            display={{ base: "none", lg: "flex" }}
          >
            <VisuallyHidden>Go to first page</VisuallyHidden>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            isDisabled={!table.getCanPreviousPage()}
          >
            <VisuallyHidden>Go to previous page</VisuallyHidden>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            isDisabled={!table.getCanNextPage()}
          >
            <VisuallyHidden>Go to next page</VisuallyHidden>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            isDisabled={!table.getCanNextPage()}
            display={{ base: "none", lg: "flex" }}
          >
            <VisuallyHidden>Go to last page</VisuallyHidden>
            <ChevronsRight />
          </Button>
        </HStack>
      </HStack>
    </Flex>
  );
}

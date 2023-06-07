import {
  Checkbox,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Skeleton,
} from "@chakra-ui/react";
import { type RouterOutputs, api } from "../../lib/api";
import { DataTable } from "../DataTable";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { useState } from "react";
import { format } from "date-fns";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { RxArrowRight } from "react-icons/rx";

const columns: ColumnDef<
  RouterOutputs["dashboard"]["getSessions"]["data"][number]
>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        isChecked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        isChecked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  { header: "Session ID", accessorKey: "id" },
  {
    header: "Customers",
    accessorFn: (row) => row.customers[0]?.customer.email,
    size: 200,
  },
  { header: "IP Address", accessorKey: "ipAddress.ipAddress" },
  { header: "Transactions", accessorKey: "transactions.length" },
  {
    header: "Date",
    accessorFn: (row) => format(new Date(row.createdAt), "MMM d, p"),
  },
  {
    id: "actions",
    accessorFn: (row) => row.id,
    cell: ({ getValue }) => {
      return (
        <Link href={`${window.location.href}/${getValue()}`}>
          <IconButton icon={<RxArrowRight />} aria-label="Actions" />
        </Link>
        // <Menu>
        //   <MenuButton
        //     as={IconButton}
        //     aria-label="Options"
        //     icon={<IoEllipsisHorizontal />}
        //     variant="link"
        //   />
        //   <MenuList>
        //     <MenuItem>View customer</MenuItem>
        //     <MenuItem>View payment details</MenuItem>
        //   </MenuList>
        // </Menu>
      );
    },
  },
];

export function ViewSessions() {
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { isLoading, data } = api.dashboard.getSessions.useQuery(
    {
      limit: pageSize,
      offset: pageIndex * pageSize,
    },
    { keepPreviousData: true }
  );
  if (isLoading) return <Skeleton />;

  return (
    <DataTable
      columns={columns}
      data={data?.data ?? []}
      onPaginationChange={setPagination}
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageCount={Math.ceil((data?.count ?? 0) / pageSize)}
    />
  );
}

import { Box, Checkbox, Flex, Tag, TagLabel } from "@chakra-ui/react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { DataTable } from "~/components/DataTable";
import { RouterOutputs } from "~/lib/api";
import { RiskLevelTag } from "./RiskLevelTag";
import { VerificationStatusTag } from "./VerificationStatusTag";

interface Props {
  data: RouterOutputs["dashboard"]["verifications"]["getAll"];
}

const columns: ColumnDef<
  RouterOutputs["dashboard"]["verifications"]["getAll"]["rows"][number]
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
    meta: {
      disableLink: true,
    },
  },
  {
    header: "Status",
    id: "status",
    cell: ({ row }) => {
      const status = row.original.status;
      return <VerificationStatusTag status={status} />;
    },
  },
  {
    header: "Risk",
    id: "risk",
    cell: ({ row }) => {
      const riskLevel = row.original.evaluableAction.riskLevel;
      return riskLevel ? <RiskLevelTag riskLevel={riskLevel} /> : null;
    },
  },
  {
    header: "Verification Checks",
    id: "checks",
    cell: ({ row }) => {
      return (
        <Flex gap={2}>
          <Tag
            colorScheme={
              row.original.documentStatus === "verified" ? "green" : "red"
            }
            size="sm"
            px={1.5}
          >
            <TagLabel>Document</TagLabel>
          </Tag>
          <Tag
            colorScheme={
              row.original.selfieStatus === "verified" ? "green" : "red"
            }
            size="sm"
            px={1.5}
          >
            <TagLabel>Selfie</TagLabel>
          </Tag>
        </Flex>
      );
    },
  },
  {
    header: "Name",
    // size: 300,
    cell({ row }) {
      return row.original.firstName + " " + row.original.lastName;
    },
  },
  {
    header: "Date",
    accessorFn: (row) => format(new Date(row.createdAt), "MMM d, p"),
  },
];

export const KycAttemptsTable = ({ data }: Props) => {
  return (
    <DataTable
      columns={columns}
      data={data}
      getRowHref={(row) => `/verifications/${row.original.id}`}
    />
  );
};

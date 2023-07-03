import { Box, Checkbox, Heading, Skeleton } from "@chakra-ui/react";
import { Layout } from "../../components/layouts/Layout";
import { type CustomPage } from "../../types/Page";
import { DataTable } from "~/components/DataTable";
import { RouterOutputs, api } from "~/lib/api";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

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
    header: "Selfie Status",
    id: "selfieStatus",
    cell: ({ row }) => {
      const status = row.original.selfieStatus;
      return status;
      //   return (
      //     <Tooltip
      //       // label={row.original.outcome?.sellerMessage}
      //       bgColor="white"
      //       fontWeight="medium"
      //       fontSize="sm"
      //       color="inherit"
      //       borderColor="gray.200"
      //       borderWidth={1}
      //       rounded="md"
      //       placement="top"
      //       hasArrow
      //       p={4}
      //     >
      //       <PaymentStatusTag status={status} />
      //     </Tooltip>
      //   );
    },
  },
  {
    header: "Document Status",
    id: "documentStatus",
    cell: ({ row }) => {
      const status = row.original.documentStatus;
      return status;
      //   return (
      //     <Tooltip
      //       // label={row.original.outcome?.sellerMessage}
      //       bgColor="white"
      //       fontWeight="medium"
      //       fontSize="sm"
      //       color="inherit"
      //       borderColor="gray.200"
      //       borderWidth={1}
      //       rounded="md"
      //       placement="top"
      //       hasArrow
      //       p={4}
      //     >
      //       <PaymentStatusTag status={status} />
      //     </Tooltip>
      //   );
    },
  },
  {
    header: "Risk",
    id: "risk",
    cell: ({ row }) => {
      //   const riskLevel = row.original.riskLevel;
      //   const isFraud = row.original.isFraud;
      //   return (
      //     <Box display="flex" alignItems="center" gap={1}>
      //       {riskLevel && <RiskLevelTag riskLevel={riskLevel} />}
      //       {isFraud && (
      //         <Tag colorScheme="red" size="sm" px={1.5}>
      //           <TagLabel>Fraud</TagLabel>
      //         </Tag>
      //       )}
      //     </Box>
      //   );
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
    header: "User Email",
    // accessorKey: "user.email",
    size: 200,
    cell({ row }) {
      //   return (
      //     row.original.session.user?.email ||
      //     row.original.paymentAttempt?.paymentMethod.email ||
      //     "--"
      //   );
    },
  },
  {
    header: "Date",
    accessorFn: (row) => format(new Date(row.createdAt), "MMM d, p"),
  },
];

const Page: CustomPage = () => {
  const { data } = api.dashboard.verifications.getAll.useQuery({});

  if (!data) return <Skeleton />;

  return (
    <Box>
      <Heading>Verifications</Heading>
      <DataTable
        columns={columns}
        data={data.rows}
        getRowHref={(row) => `/verifications/${row.original.id}`}
      />
    </Box>
  );
};

Page.getLayout = (page) => <Layout>{page}</Layout>;

export default Page;

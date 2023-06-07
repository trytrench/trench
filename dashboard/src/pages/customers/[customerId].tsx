import { Box, Checkbox, HStack, Heading, Icon, Text } from "@chakra-ui/react";
import { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/router";
import { CardWithIcon } from "~/components/CardWithIcon/CardWithIcon";
import { DataTable } from "~/components/DataTable";
import {
  TransactionsTable,
  useTransactionTableProps,
} from "~/components/TransactionsTable";
import { Layout } from "~/components/layouts/Layout";
import { Section } from "~/components/views/TransactionDetails";
import { RouterOutputs, api } from "~/lib/api";
import { type CustomPage } from "../../types/Page";
import { TransactionMap } from "~/components/TransactionMap/TransactionMap";
import { IoCheckmarkCircle } from "react-icons/io5";
import { startCase } from "lodash";
import { handleError } from "~/lib/handleError";

const columns: ColumnDef<
  NonNullable<
    RouterOutputs["dashboard"]["customers"]["get"]
  >["paymentMethods"][number]
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
        m={-3}
        p={3}
        isChecked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        onClick={(e) => e.preventDefault()}
        aria-label="Select row"
        zIndex={1}
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "card",
    header: "Card",
    cell: ({ row }) => {
      return (
        <CardWithIcon
          last4={row.original.paymentMethod.card.last4}
          brand={row.original.paymentMethod.card.brand}
          wallet={row.original.paymentMethod.card.wallet}
        />
      );
    },
  },
  {
    header: "Name",
    accessorKey: "paymentMethod.name",
  },
  {
    label: "Address",
    id: "address",
    accessorFn: (row) =>
      [
        row.paymentMethod.line1,
        row.paymentMethod.line2,
        row.paymentMethod.city,
        row.paymentMethod.state,
        row.paymentMethod.country,
      ]
        .filter(Boolean)
        .join(", "),
  },
  {
    header: "Postal code",
    accessorKey: "paymentMethod.postalCode",
  },
  {
    header: "Issuer",
    accessorKey: "paymentMethod.card.issuer",
  },
  {
    header: "Country",
    accessorKey: "paymentMethod.card.country",
  },
  {
    header: "CVC check",
    accessorKey: "paymentMethod.card.cvcCheck",
    cell: ({ row }) =>
      row.original.paymentMethod.cvcCheck === "pass" && (
        <HStack spacing={1}>
          <Icon color="green" as={IoCheckmarkCircle} />
          <Text>Passed</Text>
        </HStack>
      ),
  },
  {
    header: "ZIP check",
    cell: ({ row }) =>
      row.original.paymentMethod.postalCodeCheck && (
        <HStack spacing={1}>
          {row.original.paymentMethod.postalCodeCheck === "pass" ? (
            <>
              <Icon color="green" as={IoCheckmarkCircle} />
              <Text>Passed</Text>
            </>
          ) : (
            <Text>{startCase(row.original.paymentMethod.postalCodeCheck)}</Text>
          )}
        </HStack>
      ),
  },
  {
    header: "Address check",
    cell: ({ row }) =>
      row.original.paymentMethod.addressLine1Check && (
        <HStack spacing={1}>
          {row.original.paymentMethod.addressLine1Check === "pass" ? (
            <>
              <Icon color="green" as={IoCheckmarkCircle} />
              <Text>Passed</Text>
            </>
          ) : (
            <Text>
              {startCase(row.original.paymentMethod.addressLine1Check)}
            </Text>
          )}
        </HStack>
      ),
  },
];

const Page: CustomPage = () => {
  const router = useRouter();
  const customerId = router.query.customerId as string;

  const {
    pagination,
    setPagination,
    selectedOptions,
    setSelectedOptions,
    transactionsData,
    count,
    refetchTransactions,
  } = useTransactionTableProps({
    customerId,
  });

  const { isLoading, data } = api.dashboard.customers.get.useQuery({
    id: customerId,
  });

  if (!data) return null;

  //   const customerDetails = [
  //     { label: "Name", value: data.paymentMethod.name || "Unknown" },
  //     { label: "Email", value: data.customer.email || "Unknown" },
  //     {
  //       label: "Payment",
  //       value: (
  //         <CardWithIcon
  //           last4={data.paymentMethod.card.last4}
  //           brand={data.paymentMethod.card.brand}
  //           wallet={data.paymentMethod.card.wallet}
  //         />
  //       ),
  //     },
  //   ];

  return (
    <Box>
      <Text mb={1} fontWeight="medium" fontSize="sm" color="subtle">
        Customer
      </Text>
      <Heading mb={4}>{data.email}</Heading>

      {/* <Section title="Customer">
        <HStack>
          {customerDetails.map((item) => (
            <Box key={item.label} fontSize="sm">
              <Text w={200} color="subtle">
                {item.label}
              </Text>
              <Text>{item.value}</Text>
            </Box>
          ))}
        </HStack>
      </Section> */}

      <Section title="Transactions">
        <TransactionsTable
          transactionsData={transactionsData || []}
          count={count}
          pagination={pagination}
          onPaginationChange={setPagination}
          selectedOptions={selectedOptions}
          onSelectedOptionsChange={setSelectedOptions}
          allowMarkAsFraud
          onMarkSelectedAsFraud={() => {
            refetchTransactions().catch(handleError);
          }}
        />
      </Section>

      <Section title="Payment methods">
        <DataTable
          columns={columns}
          data={data.paymentMethods || []}
          //   searchComponent,
          //   getRowHref,
          showPagination={false}
        />
      </Section>

      <Section title="Location">
        <Box h={300}>
          <TransactionMap
            markers={[
              ...data.ipAddresses.map(({ ipAddress }) => ({
                longitude: ipAddress.longitude,
                latitude: ipAddress.latitude,
                radius: ipAddress.accuracyRadius,
                type: "device",
              })),
              ...data.paymentMethods
                .filter(({ paymentMethod }) => paymentMethod.geocode?.center)
                .map(({ paymentMethod }) => ({
                  longitude: paymentMethod.geocode.center[0],
                  latitude: paymentMethod.geocode.center[1],
                  type: "card",
                })),
            ]}
          />
        </Box>
      </Section>

      <Section title="Devices">
        {/* <DataTable
          columns={columns}
          data={data.paymentMethods || []}
          //   searchComponent,
          //   getRowHref,
          showPagination={false}
        /> */}
      </Section>

      {/* <Section
        title={
          <Box display="flex" gap={2} alignItems="center">
            Risk Level
            <RiskLevelTag riskLevel={data.riskLevel} />
          </Box>
        }
      >
        {!data?.ruleExecutions.length ? (
          <Flex justify="center" align="center">
            <Text fontSize="sm" color="subtle">
              No executed rules
            </Text>
          </Flex>
        ) : (
          <DataTable
            columns={columns}
            data={data.ruleExecutions}
            showPagination={false}
          />
        )}
      </Section>
      <TransactionDetails transactionId={transactionId} />
      <ViewTransaction transactionId={transactionId} /> */}
    </Box>
  );
};

Page.getLayout = (page) => <Layout>{page}</Layout>;

export default Page;

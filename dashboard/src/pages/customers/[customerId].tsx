import { Box, Checkbox, HStack, Heading, Icon, Text } from "@chakra-ui/react";
import { type ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/router";
import { CardWithIcon } from "~/components/card-with-icon/CardWithIcon";
import { DataTable } from "~/components/DataTable";
import {
  PaymentsTable,
  usePaymentsTableProps,
} from "~/components/PaymentsTable";
import { Layout } from "~/components/layouts/Layout";
import { Section } from "~/components/views/PaymentDetails";
import { type RouterOutputs, api } from "~/lib/api";
import { type CustomPage } from "../../types/Page";
import { PaymentMap } from "~/components/payment-map/PaymentMap";
import { IoCheckmarkCircle } from "react-icons/io5";
import { startCase } from "lodash";
import { handleError } from "~/lib/handleError";

const columns: ColumnDef<
  NonNullable<
    RouterOutputs["dashboard"]["customers"]["get"]
  >["paymentMethodLinks"][number]["paymentMethod"]
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
          last4={row.original.card?.last4}
          brand={row.original.card?.brand}
          wallet={row.original.cardWallet}
        />
      );
    },
  },
  {
    header: "Name",
    accessorKey: "paymentMethod.name",
  },
  {
    header: "Address",
    id: "address",
    accessorFn: (row) =>
      [
        row.address?.line1,
        row.address?.line2,
        row.address?.city,
        row.address?.state,
        row.address?.country,
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
      row.original.cvcCheck === "pass" && (
        <HStack spacing={1}>
          <Icon color="green" as={IoCheckmarkCircle} />
          <Text>Passed</Text>
        </HStack>
      ),
  },
  {
    header: "ZIP check",
    cell: ({ row }) =>
      row.original.postalCodeCheck && (
        <HStack spacing={1}>
          {row.original.postalCodeCheck === "pass" ? (
            <>
              <Icon color="green" as={IoCheckmarkCircle} />
              <Text>Passed</Text>
            </>
          ) : (
            <Text>{startCase(row.original.postalCodeCheck)}</Text>
          )}
        </HStack>
      ),
  },
  {
    header: "Address check",
    cell: ({ row }) =>
      row.original.addressLine1Check && (
        <HStack spacing={1}>
          {row.original.addressLine1Check === "pass" ? (
            <>
              <Icon color="green" as={IoCheckmarkCircle} />
              <Text>Passed</Text>
            </>
          ) : (
            <Text>{startCase(row.original.addressLine1Check)}</Text>
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
    data: paymentsData,
    count,
    refetch,
    isFetching: isPaymentsFetching,
  } = usePaymentsTableProps({
    customerId,
  });

  const { isFetching, data } = api.dashboard.customers.get.useQuery({
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

      <Section title="Payments">
        <PaymentsTable
          paymentsData={paymentsData || []}
          count={count}
          pagination={pagination}
          onPaginationChange={setPagination}
          selectedOptions={selectedOptions}
          onSelectedOptionsChange={setSelectedOptions}
          allowMarkAsFraud
          onMarkSelectedAsFraud={() => {
            refetch().catch(handleError);
          }}
          isLoading={isPaymentsFetching}
        />
      </Section>

      <Section title="Payment methods">
        <DataTable
          columns={columns}
          data={data.paymentMethodLinks.map((link) => link.paymentMethod) || []}
          //   searchComponent,
          //   getRowHref,
          showPagination={false}
          isLoading={isFetching}
        />
      </Section>

      <Section title="Location">
        <Box h={300}>
          <PaymentMap
            markers={[
              ...data.ipAddressLinks
                .filter(({ ipAddress }) => !!ipAddress.location)
                .map(({ ipAddress }) => ({
                  longitude: ipAddress.location?.longitude ?? 0,
                  latitude: ipAddress.location?.latitude ?? 0,
                  // radius: ipAddress.accuracyRadius,
                  type: "device" as const,
                })),
              ...data.paymentMethodLinks
                .filter(
                  ({ paymentMethod }) => !!paymentMethod.address?.location
                )
                .map(({ paymentMethod }) => ({
                  longitude: paymentMethod.address?.location?.longitude ?? 0,
                  latitude: paymentMethod.address?.location?.latitude ?? 0,
                  type: "card" as const,
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
    </Box>
  );
};

Page.getLayout = (page) => <Layout>{page}</Layout>;

export default Page;

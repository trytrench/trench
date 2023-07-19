import { Box, Flex, HStack, Image, Stack, Text } from "@chakra-ui/react";
import { ColumnDef } from "@tanstack/react-table";
import { startCase } from "lodash";
import { useRouter } from "next/router";
import { DataTable } from "~/components/DataTable";
import { DeviceSection } from "~/components/DeviceSection";
import { LocationSection } from "~/components/LocationSection";
import { RiskLevelTag } from "~/components/RiskLevelTag";
import { Layout } from "~/components/layouts/Layout";
import { Section } from "~/components/views/PaymentDetails";
import { RouterOutputs, api } from "~/lib/api";

const List = ({
  data,
}: {
  data: { label: string; value: React.ReactNode }[];
}) => (
  <Stack>
    {data.map((item) => (
      <HStack key={item.label} fontSize="sm">
        <Text w={180} color="subtle" flexShrink={0}>
          {item.label}
        </Text>
        <Text>{item.value}</Text>
      </HStack>
    ))}
  </Stack>
);

type ExecutedRuleRow = NonNullable<
  RouterOutputs["dashboard"]["evaluableActions"]["get"]
>["ruleExecutions"][number];

const columns: ColumnDef<ExecutedRuleRow>[] = [
  {
    header: "Executed Rule",
    accessorKey: "ruleSnapshot.name",
  },

  {
    header: "Risk Level",
    accessorKey: "riskLevel",
    cell: ({ row }) => {
      return <RiskLevelTag riskLevel={row.original.riskLevel} />;
    },
  },
];

const Page = () => {
  const router = useRouter();
  const verificationId = router.query.verificationId as string;

  const { isLoading, data } = api.dashboard.verifications.get.useQuery({
    id: verificationId,
  });

  if (!data) return null;

  const ipAddress = data.evaluableAction.session.deviceSnapshot?.ipAddress;

  const selfieData = [
    {
      label: "Name",
      value: data.firstName + " " + data.lastName,
    },
    {
      label: "Date of Birth",
      value: data.dobMonth + "/" + data.dobDay + "/" + data.dobYear,
    },
    {
      label: "Address",
      value: (
        <Box>
          <Box>{data.address.line1}</Box>
          <Box>{data.address.line2}</Box>
          <Box>
            {data.address.city}, {data.address.state} {data.address.postalCode}{" "}
            {data.address.country}
          </Box>
        </Box>
      ),
    },
    {
      label: "Type",
      value: startCase(data.documentType),
    },
    {
      label: "Country",
      value: data.issuingCountry,
    },
    {
      label: "Issued date",
      value: data.issuedMonth + "/" + data.issuedDay + "/" + data.issuedYear,
    },
  ];

  return (
    <Box>
      <Text mb={1} fontWeight="medium" fontSize="sm" color="subtle">
        Verification
      </Text>
      <DataTable
        columns={columns}
        data={data?.evaluableAction.ruleExecutions}
        showPagination={false}
        isLoading={isLoading}
      />
      <Flex my={6} gap={4}>
        <Box>
          <Image w={300} src={data?.selfie?.url} />
        </Box>
        <Box>
          <Image w={400} src={data?.selfieDocument?.url} />
        </Box>
      </Flex>
      {/* <Image src={data?.files[0]?.url} />
      <Image src={data?.files[1]?.url} /> */}
      <Section title="Verified outputs">
        <List data={selfieData} />
      </Section>
      <LocationSection
        ipAddress={ipAddress}
        markers={[
          ...(ipAddress?.location
            ? [
                {
                  longitude: ipAddress.location.longitude,
                  latitude: ipAddress.location.latitude,
                  type: "device" as const,
                },
              ]
            : []),
        ]}
      />
      <DeviceSection
        deviceSnapshot={data.evaluableAction.session.deviceSnapshot}
      />
      <Section title="Metadata">
        <Text fontSize="sm" whiteSpace="pre">
          {JSON.stringify(data.metadata, null, 2)}
        </Text>
      </Section>
    </Box>
  );
};

Page.getLayout = (page) => <Layout>{page}</Layout>;

export default Page;

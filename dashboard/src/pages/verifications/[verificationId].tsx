import { Box, Divider, HStack, Image, Stack, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { type ReactNode } from "react";
import { Layout } from "~/components/layouts/Layout";
import { RouterOutputs, api } from "~/lib/api";
import { startCase } from "lodash";
import { DataTable } from "~/components/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { RiskLevelTag } from "~/components/RiskLevelTag";

export const Section = ({
  children,
  title,
}: {
  children: ReactNode;
  title: string | ReactNode;
}) => (
  <Box py={4}>
    <Text fontSize="lg" fontWeight="bold" mb={2}>
      {title}
    </Text>
    <Divider borderColor="gray.300" mb={4} />
    {children}
  </Box>
);

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
      <Image src={data?.selfie.url} />
      <Image src={data?.files[0]?.url} />
      <Image src={data?.files[1]?.url} />
      <Section title="Verified outputs">
        <List data={selfieData} />
      </Section>
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

import {
  Box,
  Flex,
  HStack,
  Heading,
  Icon,
  IconButton,
  Image,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Stack,
  Tag,
  TagLabel,
  Text,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { startCase } from "lodash";
import { MoreHorizontal } from "lucide-react";
import { useRouter } from "next/router";
import { DataTable } from "~/components/DataTable";
import { DeviceSection } from "~/components/DeviceSection";
import { LocationSection } from "~/components/LocationSection";
import { PaymentStatusTag } from "~/components/PaymentStatusTag";
import { RiskLevelTag } from "~/components/RiskLevelTag";
import { Layout } from "~/components/layouts/Layout";
import { Section } from "~/components/views/PaymentDetails";
import { RouterOutputs, api } from "~/lib/api";
import { handleError } from "~/lib/handleError";

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
  const toast = useToast();

  const { isLoading, data } = api.dashboard.verifications.get.useQuery({
    id: verificationId,
  });

  const { mutateAsync: evaluateAction } =
    api.dashboard.verifications.evaluate.useMutation();

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
      <Flex justify="space-between" align="center">
        <HStack align="baseline" spacing={4}>
          <Heading mb={2}>
            {data.firstName} {data.lastName}
          </Heading>

          <PaymentStatusTag status={data.status} />

          <Flex gap={2}>
            <Tag
              colorScheme={data.documentStatus === "verified" ? "green" : "red"}
              size="sm"
              px={1.5}
            >
              <TagLabel>Document</TagLabel>
            </Tag>
            <Tag
              colorScheme={data.selfieStatus === "verified" ? "green" : "red"}
              size="sm"
              px={1.5}
            >
              <TagLabel>Selfie</TagLabel>
            </Tag>
          </Flex>
        </HStack>
        <Menu placement="bottom-end">
          <MenuButton
            as={IconButton}
            size="sm"
            ml="auto"
            display={{ base: "none", lg: "flex" }}
            icon={<Icon as={MoreHorizontal} />}
          ></MenuButton>
          <MenuList minWidth="150px">
            <MenuItem
              onClick={() => {
                toast.promise(
                  evaluateAction({
                    evaluableActionId: data.evaluableAction.id,
                  }),
                  {
                    success: {
                      title: "Successfully reran rules",
                    },
                    error: (err) => {
                      const message = err.message;
                      handleError(err);
                      return {
                        title: `Error: ${message ?? "Unknown"}`,
                      };
                    },
                    loading: {
                      title: "Loading...",
                    },
                  }
                );
              }}
            >
              Rerun rules
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
      <HStack spacing={6} mb={2}>
        <Text color="gray.600" fontWeight="medium">
          {format(
            new Date(data.evaluableAction.createdAt),
            "MMM dd, yyyy, h:mm a"
          )}
        </Text>
        <Text color="gray.500">
          <Text userSelect="none" display="inline">
            ID:{" "}
          </Text>
          {data.id}
        </Text>
      </HStack>

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
                  type: "device",
                },
              ]
            : []),
          ...(data?.address?.location
            ? [
                {
                  longitude: data.address.location.longitude,
                  latitude: data.address.location.latitude,
                  type: "kyc",
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

      <Section title="Raw Transforms Data">
        <Text fontFamily="mono" whiteSpace={"pre"} fontSize="sm">
          {JSON.stringify(data.evaluableAction.transformsOutput, null, 2)}
        </Text>
      </Section>
    </Box>
  );
};

Page.getLayout = (page) => <Layout>{page}</Layout>;

export default Page;

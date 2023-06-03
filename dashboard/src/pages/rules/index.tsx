import { Layout } from "~/components/layouts/Layout";
import { type RouterOutputs, api } from "~/lib/api";
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { Box, Button, Checkbox, Flex, Heading, Icon } from "@chakra-ui/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { type CustomPage } from "../../types/Page";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import { DataTable } from "../../components/DataTable";
import NextLink from "next/link";
import { RiskLevelTag } from "~/components/RiskLevelTag";
import { EditIcon, InfoIcon, Plus } from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { RiskLevel } from "@prisma/client";
import { PREFIX, SUFFIX } from "~/components/editor/constants";

type RulesRow = RouterOutputs["dashboard"]["rules"]["getAll"][number];

function RuleModal(props: { rule: RulesRow }) {
  const { rule } = props;

  const { isOpen, onOpen, onClose } = useDisclosure();

  const realCode = useMemo(() => {
    return `${PREFIX}\n${rule.tsCode ?? ""}\n${SUFFIX}`;
  }, [rule.tsCode]);

  return (
    <>
      <Button
        onClick={(e) => {
          e.preventDefault();
          onOpen();
        }}
        color="gray.400"
        bg="transparent"
        as="button"
        m={-3}
        p={3}
        _hover={{
          color: "black",
        }}
        _active={{
          color: "black",
        }}
      >
        <InfoIcon height={16} width={16} />
      </Button>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent maxW="56rem">
          <ModalHeader>Rule: {rule.name}</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={8}>
            <Heading mt={4} mb={2} size="sm">
              Description
            </Heading>
            <Text>{rule.description || "None"}</Text>

            <Heading mt={8} mb={2} size="sm">
              Code
            </Heading>
            <Highlight
              theme={themes.vsDark}
              code={realCode}
              language="typescript"
            >
              {({ className, style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  style={{
                    ...style,
                    padding: "12px",
                    fontSize: "14px",
                    overflowX: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {tokens.map((line, i) => (
                    <div key={i} {...getLineProps({ line })} style={{}}>
                      {/* <span>{i + 1}</span> */}
                      {line.map((token, key) => (
                        <span key={key} {...getTokenProps({ token })} />
                      ))}
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}

const RISK_LEVEL_ORDER = [
  RiskLevel.Normal,
  RiskLevel.Medium,
  RiskLevel.High,
  RiskLevel.VeryHigh,
];
const columns: ColumnDef<RulesRow>[] = [
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
    header: "Rule",
    accessorKey: "name",
  },
  {
    header: "Risk Level",
    accessorKey: "riskLevel",
    cell({ row }) {
      return <RiskLevelTag riskLevel={row.original.riskLevel} />;
    },
  },
  {
    header: "Triggers",
    accessorKey: "_count.executions",
  },
  {
    header: "Info",
    cell({ row }) {
      return <RuleModal rule={row.original} />;
    },
    meta: {
      disableLink: true,
    },
  },
  {
    header: "Edit",
    cell({ row }) {
      return (
        <Link href={`/rules/${row.original.id}/edit`}>
          <Button
            color="gray.400"
            bg="transparent"
            as="button"
            m={-3}
            p={3}
            _hover={{
              color: "black",
            }}
            _active={{
              color: "black",
            }}
          >
            <EditIcon height={16} width={16} />
          </Button>
        </Link>
      );
    },
  },
];

const RulesPage: CustomPage = () => {
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  const { data: rulesData, isLoading } = api.dashboard.rules.getAll.useQuery({
    limit: pageSize,
    offset: pageIndex * pageSize,
  });

  return (
    <Box>
      <Flex justify="space-between" mb={4} align="center">
        <Heading>Rules</Heading>
        <NextLink href="/rules/create" passHref>
          <Button leftIcon={<Icon as={Plus} />} size="sm" as="a">
            New
          </Button>
        </NextLink>
      </Flex>
      <DataTable
        columns={columns}
        data={rulesData ?? []}
        onPaginationChange={setPagination}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={-1}
        getRowHref={(row) => `/rules/${row.original.id}`}
        isLoading={isLoading}
      />
    </Box>
  );
};

RulesPage.getLayout = (page) => <Layout>{page}</Layout>;

export default RulesPage;

import { Layout } from "~/components/layouts/Layout";
import { type RouterOutputs, api } from "~/lib/api";
import {
  IconButton,
  Menu,
  MenuButton,
  MenuIcon,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Portal,
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
import {
  ChevronDownIcon,
  EditIcon,
  InfoIcon,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { Highlight, themes } from "prism-react-renderer";
import { PREFIX, SUFFIX } from "~/components/editor/constants";
import { RiskLevel } from "../../common/types";
import { RuleModal } from "../../components/RuleModal";

type RulesRow = RouterOutputs["dashboard"]["rules"]["getAll"]["rows"][number];

const RISK_LEVEL_ORDER = [
  RiskLevel.Low,
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
    accessorKey: "currentRuleSnapshot.name",
  },
  {
    header: "Risk Level",
    accessorKey: "riskLevel",
    cell({ row }) {
      return (
        <RiskLevelTag riskLevel={row.original.currentRuleSnapshot.riskLevel} />
      );
    },
  },
  {
    header: "Triggers",
    accessorKey: "currentRuleSnapshot._count.executions",
  },
  {
    header: "Info",
    cell({ row }) {
      return <RuleModal ruleSnapshot={row.original.currentRuleSnapshot} />;
    },
    meta: {
      disableLink: true,
    },
  },
  {
    header: "Edit",
    meta: {
      disableLink: true,
    },
    cell({ row }) {
      return (
        <Menu placement="bottom-end">
          <MenuButton
            as={IconButton}
            aria-label="Options"
            icon={<Icon as={MoreHorizontal} />}
            size="xs"
          />
          <Portal>
            <MenuList>
              <Link href={`/rules/${row.original.id}/edit`}>
                <MenuItem>Edit</MenuItem>
              </Link>
              {/* <MenuItem color="red.500">Delete</MenuItem> */}
            </MenuList>
          </Portal>
        </Menu>
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
          <Button
            colorScheme="blue"
            leftIcon={<Icon mb={0.5} mr={-0.5} as={Plus} />}
            size="sm"
            as="a"
          >
            New
          </Button>
        </NextLink>
      </Flex>
      <DataTable
        columns={columns}
        data={rulesData?.rows ?? []}
        onPaginationChange={setPagination}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={Math.ceil((rulesData?.count ?? 0) / pageSize)}
        getRowHref={(row) => `/rules/${row.original.id}`}
        isLoading={isLoading}
      />
    </Box>
  );
};

RulesPage.getLayout = (page) => <Layout>{page}</Layout>;

export default RulesPage;

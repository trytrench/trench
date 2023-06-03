import {
  Box,
  Button,
  Checkbox,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  Tag,
  TagLabel,
  Tooltip,
} from "@chakra-ui/react";
import {
  type Updater,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { MAP_RISK_LEVEL_TO_DATA, RiskLevelTag } from "./RiskLevelTag";

import { format } from "date-fns";
import {
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, type RouterOutputs } from "./../lib/api";
import { CardWithIcon } from "./CardWithIcon/CardWithIcon";
import { DataTable } from "./DataTable";
import { SearchInput } from "./SearchInput";
import { TransactionStatusTag } from "./TransactionStatusTag";
import {
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  DiscoverIcon,
  JCBIcon,
  DinersIcon,
} from "./CardWithIcon/icons";
import { formatWalletAddress } from "~/utils/formatWalletAddress";
import { handleError } from "~/lib/handleError";
import { MoreHorizontal } from "lucide-react";
import { ChevronDownIcon } from "@chakra-ui/icons";

import { useRouter } from "next/router";

type Option = {
  label: string;
  value: string;
};

const MAP_BRAND_TO_ICON = {
  visa: VisaIcon,
  mastercard: MastercardIcon,
  amex: AmexIcon,
  discover: DiscoverIcon,
  jcb: JCBIcon,
  diners: DinersIcon,
};

export type TxRow =
  RouterOutputs["dashboard"]["paymentAttempts"]["getAll"]["data"][number];

const columns: ColumnDef<TxRow>[] = [
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
      const status = row.original.outcome?.status || "incomplete";
      return (
        <Tooltip
          // label={row.original.outcome?.sellerMessage}
          bgColor="white"
          fontWeight="medium"
          fontSize="sm"
          color="inherit"
          borderColor="gray.200"
          borderWidth={1}
          rounded="md"
          placement="top"
          hasArrow
          p={4}
        >
          <TransactionStatusTag status={status} />
        </Tooltip>
      );
    },
  },
  {
    header: "Risk",
    id: "risk",
    cell: ({ row }) => {
      const { assessment } = row.original;
      const riskLevel = assessment?.riskLevel;
      const isFraud = assessment?.isFraud;

      return (
        <Box display="flex" alignItems="center" gap={1}>
          {riskLevel && <RiskLevelTag riskLevel={riskLevel} />}
          {isFraud && (
            <Tag colorScheme="red" size="sm" px={1.5}>
              <TagLabel>Fraud</TagLabel>
            </Tag>
          )}
        </Box>
      );
    },
  },
  {
    header: "Amount",
    accessorFn: (row) =>
      (row.amount / 100).toLocaleString("en-US", {
        style: "currency",
        currency: row.currency,
      }),
  },
  {
    header: "Description",
    accessorKey: "description",
    size: 300,
  },
  {
    header: "Seller",
    accessorKey: "sellerName",
  },
  {
    header: "Customer Email",
    accessorKey: "customer.email",
    size: 200,
  },

  {
    header: "Customer Name",
    accessorKey: "paymentMethod.name",
  },
  {
    header: "Card",
    accessorKey: "row.paymentMethod.card",
    cell: ({ row }) => {
      const { card } = row.original.paymentMethod;
      if (!card) return null;
      return <CardWithIcon brand={card.brand} last4={card.last4} />;
    },
  },
  {
    header: "Date",
    accessorFn: (row) => format(new Date(row.createdAt), "MMM d, p"),
  },
  // {
  //   header: "Wallet",
  //   accessorFn: (row) => formatWalletAddress(row.walletAddress),
  // },
];

const searchOptions = [
  {
    label: "email:",
    value: "email",
  },
  {
    label: "sellerName:",
    value: "sellerName",
  },
  {
    label: "sellerId:",
    value: "sellerId",
  },
  {
    label: "description:",
    value: "description",
  },
  {
    label: "riskLevel:",
    value: "riskLevel",
  },
  ...Object.entries(MAP_RISK_LEVEL_TO_DATA).map(([key, value]) => ({
    label: `${value.label}`,
    value: `riskLevel:${key}`,
  })),
  {
    label: "status:",
    value: "status",
  },
  {
    label: `Incomplete`,
    value: `status:null`,
  },
  {
    label: `Succeeded`,
    value: `status:succeeded`,
  },
  {
    label: `Failed`,
    value: `status:failed`,
  },
  {
    label: "isFraud:",
    value: "isFraud",
  },
  {
    label: `True`,
    value: `isFraud:true`,
  },
  {
    label: `False`,
    value: `isFraud:false`,
  },
  // {
  //   label: "status:",
  //   value: "status",
  // },
];

function optionToQueryKv(option: Option): [string, string] | null {
  const { value } = option;

  // email:blabla to [email, blabla]

  const [key, val] = value.split(":");
  if (!key || !val) return null;
  return [key, val];
}

function queryKvToOption([key, val]: [string, string]): Option | null {
  if (!key || !val) return null;

  // if key has multiple values, we need to map it to the label
  if (
    searchOptions.some((opt) => opt.value.startsWith(key) && opt.value !== key)
  ) {
    const option = searchOptions.find((opt) => opt.value === `${key}:${val}`);
    if (!option) return null;
    return {
      label: `${key}:${option.label}`,
      value: `${key}:${val}`,
    };
  } else {
    return {
      label: `${key}:${val}`,
      value: `${key}:${val}`,
    };
  }
}

interface PaymentsTableProps {
  paymentsData: TxRow[];
  count?: number;

  pagination: PaginationState;
  onPaginationChange: (newVal: Updater<PaginationState>) => void;

  selectedOptions?: Option[];
  onSelectedOptionsChange?: (newVal: Option[]) => void;

  allowMarkAsFraud?: boolean;
  onMarkSelectedAsFraud?: (ids: string[]) => void;
  isLoading?: boolean;
}

export function PaymentsTable({
  paymentsData: transactionsData,
  count,
  pagination,
  onPaginationChange,

  selectedOptions,
  onSelectedOptionsChange,

  allowMarkAsFraud = false,
  onMarkSelectedAsFraud,
}: PaymentsTableProps) {
  const { pageIndex, pageSize } = pagination;

  const dataCount = count ?? transactionsData.length;

  const { mutateAsync } =
    api.dashboard.paymentAttempts.assessment.updateMany.useMutation();

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const createMarkSelectedAsFraud = useCallback(
    (markFraudAs: boolean) => () => {
      const ids = Object.keys(rowSelection);
      if (ids.length === 0) return;
      mutateAsync({ ids, changes: { isFraud: markFraudAs } })
        .then(() => {
          setRowSelection({});
          onMarkSelectedAsFraud?.(ids);
        })
        .catch(handleError);
    },
    [mutateAsync, onMarkSelectedAsFraud, rowSelection]
  );

  const numSelected = Object.values(rowSelection).filter(Boolean).length;

  return (
    <DataTable
      getRowId={(row) => row.id}
      columns={columns}
      data={transactionsData}
      onPaginationChange={onPaginationChange}
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageCount={Math.ceil(dataCount / pageSize)}
      getRowHref={(row) => `/transactions/${row.original.id}`}
      header={
        <Box
          w="full"
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mr={4}
        >
          {selectedOptions && onSelectedOptionsChange && (
            <SearchInput
              placeholder="Search transactions"
              options={searchOptions}
              selectedOptions={selectedOptions}
              onChange={onSelectedOptionsChange}
            />
          )}
          {allowMarkAsFraud && numSelected > 0 && (
            <Menu placement="bottom-end">
              <MenuButton
                colorScheme={"blue"}
                as={Button}
                aria-label="Options"
                size="sm"
                rightIcon={<ChevronDownIcon />}
              >
                Update ({numSelected})
              </MenuButton>
              <Portal>
                <MenuList>
                  <MenuItem
                    onClick={createMarkSelectedAsFraud(true)}
                    isDisabled={numSelected === 0}
                  >
                    Mark as fraud
                  </MenuItem>
                  <MenuItem
                    onClick={createMarkSelectedAsFraud(false)}
                    isDisabled={numSelected === 0}
                  >
                    Mark as not fraud
                  </MenuItem>
                </MenuList>
              </Portal>
            </Menu>
          )}
        </Box>
      }
      showColumnVisibilityOptions
      rowSelection={rowSelection}
      onRowSelectionChange={setRowSelection}
      isLoading={isLoading}
    />
  );
}

function usePagination(
  defaultPagination: PaginationState
): [PaginationState, (pagination: PaginationState) => void] {
  const router = useRouter();

  const pageIndex = useMemo(
    () =>
      parseInt(
        router.query.pageIndex?.toString() ||
          defaultPagination.pageIndex.toString(),
        10
      ),
    [router.query.pageIndex, defaultPagination.pageIndex]
  );
  const pageSize = useMemo(
    () =>
      parseInt(
        router.query.pageSize?.toString() ||
          defaultPagination.pageSize.toString(),
        10
      ),
    [router.query.pageSize, defaultPagination.pageSize]
  );

  const pagination = useMemo(
    () => ({
      pageIndex,
      pageSize,
    }),
    [pageIndex, pageSize]
  );

  const setPagination = useCallback(
    (arg: SetStateAction<PaginationState>) => {
      if (typeof arg === "function") {
        arg = arg(pagination);
      }
      router
        .replace({
          query: {
            ...router.query,
            pageIndex: arg.pageIndex.toString(),
            pageSize: arg.pageSize.toString(),
          },
        })
        .catch(handleError);
    },
    [pagination, router]
  );

  return [pagination, setPagination];
}

const encodeOptions = (options: Option[]) => {
  const encoded = options
    .map(optionToQueryKv)
    .filter((kv) => kv !== null)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");
  return encodeURIComponent(encoded);
};

const decodeOptions = (str: string) => {
  const decodedStr = decodeURIComponent(str);
  const options: Option[] = [];
  decodedStr.split("&").forEach((pair) => {
    const kv = pair.split("=").map(decodeURIComponent);
    const option = queryKvToOption(kv);
    if (option) {
      options.push(option);
    }
  });

  console.log("DECODED OPTIONS", options);
  return options;
};

function useQueryOptions(
  defaultOptions: Option[] = []
): [Option[], (options: Option[]) => void] {
  const router = useRouter();

  const selectedOptions = useMemo(() => {
    const queryOptions = router.query.options;
    if (queryOptions && typeof queryOptions === "string") {
      try {
        const options = decodeOptions(queryOptions);
        return options;
      } catch (err) {
        console.error(err);
      }
    }
    return defaultOptions;
  }, [router.query.options, defaultOptions]);

  const setOptions = useCallback(
    (options: Option[]) => {
      const encodedOptions = encodeOptions(options);
      console.log("SETTING OPTIONS", options, encodedOptions);
      router
        .replace({
          query: {
            ...router.query,
            options: encodedOptions,
            pageIndex: 0,
          },
        })
        .catch((err) => console.error(err));
    },
    [router]
  );

  return [selectedOptions, setOptions];
}

export function usePaymentsTableProps({
  linkedPaymentAttemptId,
  executedRuleId,
  customerId,
}: {
  linkedPaymentAttemptId?: string;
  executedRuleId?: string;
  customerId?: string;
}) {
  const [pagination, setPagination] = usePagination({
    pageIndex: 0,
    pageSize: 20,
  });

  const { pageIndex, pageSize } = pagination;
  const [selectedOptions, setSelectedOptions] = useQueryOptions([]);

  const options = useMemo(
    () =>
      selectedOptions.reduce<Record<string, string>>((acc, option) => {
        const [key, value] = option.value.split(":");
        acc[key] = value;
        return acc;
      }, {}),
    [selectedOptions]
  );

  const { isLoading, data, refetch } =
    api.dashboard.paymentAttempts.getAll.useQuery(
      {
        limit: pageSize,
        offset: pageIndex * pageSize,
        linkedPaymentAttemptId,
        executedRuleId,
        customerId,
        search: options,
      },
      { keepPreviousData: true }
    );

  return useMemo(
    () => ({
      pagination,
      setPagination,
      selectedOptions,
      setSelectedOptions,
      transactionsData: data?.data ?? [],
      refetchTransactions: refetch,
      count: data?.count,
      isLoading,
    }),
    [
      pagination,
      setPagination,
      selectedOptions,
      setSelectedOptions,
      data?.data,
      data?.count,
      refetch,
      isLoading,
    ]
  );
}

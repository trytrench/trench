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
  Text,
  Tooltip,
} from "@chakra-ui/react";
import {
  type Updater,
  type ColumnDef,
  type PaginationState,
} from "@tanstack/react-table";
import { MAP_RISK_LEVEL_TO_DATA, RiskLevelTag } from "./RiskLevelTag";

import { format } from "date-fns";
import { type SetStateAction, useCallback, useMemo, useState } from "react";
import { api, type RouterOutputs } from "../lib/api";
import { CardWithIcon } from "./card-with-icon/CardWithIcon";
import { DataTable } from "./DataTable";
import { SearchInput } from "./SearchInput";
import { PaymentStatusTag } from "./PaymentStatusTag";
import {
  VisaIcon,
  MastercardIcon,
  AmexIcon,
  DiscoverIcon,
  JCBIcon,
  DinersIcon,
} from "./card-with-icon/icons";
import { handleError } from "~/lib/handleError";
import { ChevronDownIcon } from "@chakra-ui/icons";

import { useRouter } from "next/router";
import { PaymentOutcomeStatus } from "@prisma/client";

type Option = {
  label: string;
  value: string;
};

export type EvaluableActionRow =
  RouterOutputs["dashboard"]["evaluableActions"]["getAll"]["rows"][number];

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
    label: `Pending`,
    value: `status:${PaymentOutcomeStatus.PENDING}`,
  },
  {
    label: `Succeeded`,
    value: `status:${PaymentOutcomeStatus.SUCCEEDED}`,
  },
  {
    label: `Failed`,
    value: `status:${PaymentOutcomeStatus.FAILED}`,
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
  paymentsData: EvaluableActionRow[];
  count?: number;

  pagination: PaginationState;
  onPaginationChange: (newVal: Updater<PaginationState>) => void;

  selectedOptions?: Option[];
  onSelectedOptionsChange?: (newVal: Option[]) => void;

  allowMarkAsFraud?: boolean;
  onMarkSelectedAsFraud?: (ids: string[], markedTo: boolean) => void;
  isLoading?: boolean;

  linkedPaymentAttemptActionId?: string;
}

export function PaymentsTable({
  paymentsData,
  count,
  pagination,
  onPaginationChange,

  selectedOptions,
  onSelectedOptionsChange,

  allowMarkAsFraud = false,
  onMarkSelectedAsFraud,

  isLoading = false,

  linkedPaymentAttemptActionId,
}: PaymentsTableProps) {
  const { pageIndex, pageSize } = pagination;

  const dataCount = count ?? paymentsData.length;

  const { mutateAsync } =
    api.dashboard.evaluableActions.updateMany.useMutation();

  const { data: linkedAction } = api.dashboard.evaluableActions.get.useQuery(
    {
      id: linkedPaymentAttemptActionId ?? "",
    },
    {
      enabled: !!linkedPaymentAttemptActionId,
    }
  );

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const createMarkSelectedAsFraud = useCallback(
    (markFraudAs: boolean) => () => {
      const ids = Object.keys(rowSelection);
      if (ids.length === 0) return;
      mutateAsync({ ids: ids, data: { isFraud: markFraudAs } })
        .then(() => {
          setRowSelection({});
          onMarkSelectedAsFraud?.(ids, markFraudAs);
        })
        .catch(handleError);
    },
    [mutateAsync, onMarkSelectedAsFraud, rowSelection]
  );

  const numSelected = Object.values(rowSelection).filter(Boolean).length;

  const columns: ColumnDef<EvaluableActionRow>[] = useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            isChecked={table.getIsAllPageRowsSelected()}
            onChange={(e) =>
              table.toggleAllPageRowsSelected(!!e.target.checked)
            }
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
          const status =
            row.original.paymentAttempt?.outcome?.status || "incomplete";
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
              <PaymentStatusTag status={status} />
            </Tooltip>
          );
        },
      },
      {
        header: "Risk",
        id: "risk",
        cell: ({ row }) => {
          const riskLevel = row.original.riskLevel;
          const isFraud = row.original.isFraud;
          const stripeReview = row.original.session.stripeReview;

          const reviewOpen = stripeReview?.open ?? false;

          return (
            <Box display="flex" alignItems="center" gap={1}>
              {riskLevel && <RiskLevelTag riskLevel={riskLevel} />}
              {isFraud && (
                <Tag colorScheme="red" size="sm" px={1.5}>
                  <TagLabel>Fraud</TagLabel>
                </Tag>
              )}
              {reviewOpen && (
                <Tag colorScheme="yellow" size="sm" px={1.5}>
                  <TagLabel>Needs Review</TagLabel>
                </Tag>
              )}
            </Box>
          );
        },
      },
      {
        header: "Amount",
        accessorFn: (row) =>
          row.paymentAttempt
            ? (row.paymentAttempt.amount / 100).toLocaleString("en-US", {
                style: "currency",
                currency: row.paymentAttempt.currency,
              })
            : "--",
      },
      {
        header: "Description",
        accessorKey: "description",
        size: 200,
        cell({ row }) {
          return row.original.paymentAttempt?.description || "--";
        },
      },
      {
        header: "User Email",
        // accessorKey: "user.email",
        size: 200,
        cell({ row }) {
          const displayedEmail =
            row.original.session.user?.email ||
            row.original.paymentAttempt?.paymentMethod.email;
          const linkedEmail =
            linkedAction?.session.user?.email ||
            linkedAction?.paymentAttempt?.paymentMethod.email;

          return (
            <Text
              fontWeight={displayedEmail === linkedEmail ? "bold" : undefined}
            >
              {displayedEmail || "--"}
            </Text>
          );
        },
      },

      {
        header: "User Name",
        accessorKey: "paymentMethod.name",
        cell({ row }) {
          return (
            row.original.session.user?.name ||
            row.original.paymentAttempt?.paymentMethod.name ||
            "--"
          );
        },
      },
      {
        header: "Card",
        accessorKey: "row.paymentMethod.card",
        cell({ row }) {
          const card = row.original.paymentAttempt?.paymentMethod.card;
          const linkedCard = linkedAction?.paymentAttempt?.paymentMethod.card;

          if (!card) return null;
          return (
            <CardWithIcon
              brand={card.brand}
              last4={card.last4}
              bold={card.fingerprint === linkedCard?.fingerprint}
            />
          );
        },
      },
      {
        header: "Date",
        accessorFn: (row) => format(new Date(row.createdAt), "MMM d, p"),
      },
    ],
    [linkedAction]
  );

  const linkedColumns: ColumnDef<EvaluableActionRow>[] = useMemo(
    () => [
      {
        header: "Device ID",
        cell({ row }) {
          const displayed = row.original.session.deviceSnapshot?.deviceId;
          const linked = linkedAction?.session.deviceSnapshot?.deviceId;

          return (
            <Text fontWeight={displayed === linked ? "bold" : undefined}>
              {displayed || "--"}
            </Text>
          );
        },
      },
      {
        header: "Device Fingerprint",
        cell({ row }) {
          const displayed = row.original.session.deviceSnapshot?.fingerprint;
          const linked = linkedAction?.session.deviceSnapshot?.fingerprint;

          return (
            <Text fontWeight={displayed === linked ? "bold" : undefined}>
              {displayed || "--"}
            </Text>
          );
        },
      },
      {
        header: "IP Address",
        cell({ row }) {
          const displayed =
            row.original.session.deviceSnapshot?.ipAddress?.ipAddress;
          const linked =
            linkedAction?.session.deviceSnapshot?.ipAddress?.ipAddress;

          return (
            <Text fontWeight={displayed === linked ? "bold" : undefined}>
              {displayed || "--"}
            </Text>
          );
        },
      },
    ],
    [linkedAction]
  );

  const allColumns = useMemo(
    () => [...columns, ...(linkedAction ? linkedColumns : [])],
    [columns, linkedAction, linkedColumns]
  );

  return (
    <DataTable
      rowHeight={9}
      getRowId={(row) => row.id}
      columns={allColumns}
      data={paymentsData}
      onPaginationChange={onPaginationChange}
      pageIndex={pageIndex}
      pageSize={pageSize}
      pageCount={Math.ceil(dataCount / pageSize)}
      getRowHref={(row) => `/payments/${row.original.id}`}
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
              placeholder="Search payment attempts"
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
): [PaginationState, (arg: SetStateAction<PaginationState>) => void] {
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
    .map((kv) => kv as [string, string])
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
    const option = queryKvToOption(kv as [string, string]);
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

export function useEvaluableActionProps({
  paymentAttemptActionId,
  executedRuleSnapshotId,
  userId,
}: {
  paymentAttemptActionId?: string;
  executedRuleSnapshotId?: string;
  userId?: string;
}) {
  const [pagination, setPagination] = usePagination({
    pageIndex: 0,
    pageSize: 20,
  });

  const { pageIndex, pageSize } = pagination;
  const [selectedOptions, setSelectedOptions] = useQueryOptions([]);

  const filters = useMemo(
    () =>
      selectedOptions.reduce<Record<string, string>>((acc, option) => {
        const [key, value] = option.value.split(":");
        if (!key || !value) return acc;
        acc[key] = value;
        return acc;
      }, {}),
    [selectedOptions]
  );

  const queryProps = useMemo(
    () => ({
      limit: pageSize,
      offset: pageIndex * pageSize,
      linkedTo: {
        paymentAttemptActionId,
      },
      executedRuleSnapshotId,
      userId,
      filters,
    }),
    [
      pageSize,
      pageIndex,
      paymentAttemptActionId,
      executedRuleSnapshotId,
      userId,
      filters,
    ]
  );

  const { isLoading, data, refetch, isFetching, isPreviousData } =
    api.dashboard.evaluableActions.getAll.useQuery(queryProps, {
      keepPreviousData: true,
      refetchOnWindowFocus: false,
      staleTime: 5000,
    });

  return useMemo(
    () => ({
      pagination,
      setPagination,
      selectedOptions,
      setSelectedOptions,
      data: data?.rows ?? [],
      refetch,
      count: data?.count,
      isLoading,
      isFetching,
      isPreviousData,
      queryProps,
    }),
    [
      pagination,
      setPagination,
      selectedOptions,
      setSelectedOptions,
      data?.rows,
      data?.count,
      refetch,
      isLoading,
      isFetching,
      isPreviousData,
      queryProps,
    ]
  );
}

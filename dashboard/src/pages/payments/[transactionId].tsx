import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Divider,
  Flex,
  HStack,
  Heading,
  Highlight,
  Icon,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuItemOption,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Tooltip,
  VStack,
  useDisclosure,
  usePrevious,
  useToast,
} from "@chakra-ui/react";
import { type ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/router";
import { CardWithIcon } from "~/components/CardWithIcon/CardWithIcon";
import { DataTable } from "~/components/DataTable";
import { RiskLevelTag } from "~/components/RiskLevelTag";
import { TransactionStatusTag } from "~/components/TransactionStatusTag";
import { Layout } from "~/components/layouts/Layout";
import {
  Section,
  TransactionDetails,
} from "~/components/views/TransactionDetails";
import { type RouterOutputs, api } from "~/lib/api";
import { type CustomPage } from "../../types/Page";
import {
  CreditCard,
  Globe,
  Mail,
  MoreHorizontal,
  Network,
  Phone,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  DEFAULT_BLOCKLISTS,
  DefaultBlockListAlias,
} from "~/common/defaultBlocklists";
import { nanoid } from "nanoid";
import { handleError } from "~/lib/handleError";
import { format } from "date-fns";
import NextLink from "next/link";

const MAP_BLOCKLIST_TO_ICON: Record<DefaultBlockListAlias, ReactNode> = {
  [DefaultBlockListAlias.CardFingerprintBlocklist]: <CreditCard />,
  [DefaultBlockListAlias.DeviceBlocklist]: <Phone />,
  [DefaultBlockListAlias.EmailBlocklist]: <Mail />,
  [DefaultBlockListAlias.IpBlocklist]: <Globe />,
  [DefaultBlockListAlias.WalletAddressBlocklist]: <Wallet />,
};

type Transaction = RouterOutputs["dashboard"]["transactions"]["get"];
type BlockListItem = {
  tempId: string;
  alias: DefaultBlockListAlias;
  value: string;
};

function getBlockListItems(transaction: Transaction): BlockListItem[] {
  const items: BlockListItem[] = [];
  if (transaction.customer?.email) {
    items.push({
      tempId: nanoid(),
      alias: DefaultBlockListAlias.EmailBlocklist,
      value: transaction?.customer.email,
    });
  }
  items.push({
    tempId: nanoid(),
    alias: DefaultBlockListAlias.DeviceBlocklist,
    value: transaction.session.device.id,
  });
  items.push({
    tempId: nanoid(),
    alias: DefaultBlockListAlias.IpBlocklist,
    value: transaction.session.ipAddress.ipAddress,
  });
  if (transaction.paymentMethod.card?.fingerprint) {
    items.push({
      tempId: nanoid(),
      alias: DefaultBlockListAlias.CardFingerprintBlocklist,
      value: transaction.paymentMethod.card.fingerprint,
    });
  }
  items.push({
    tempId: nanoid(),
    alias: DefaultBlockListAlias.WalletAddressBlocklist,
    value: transaction.walletAddress,
  });

  return items;
}

function BlockTransaction(props: { transaction: Transaction }) {
  const { transaction } = props;

  const [selectedItems, setSelectedItems] = useState<BlockListItem[]>([]);
  const [blockListItems, setBlockListItems] = useState<BlockListItem[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure({
    onOpen: () => {
      const blockListItems = getBlockListItems(transaction);
      setSelectedItems(blockListItems);
      setBlockListItems(blockListItems);
    },
  });

  const { mutateAsync, isLoading } =
    api.dashboard.lists.addDefaultBlocklistItems.useMutation();
  const toast = useToast();
  const handleAddSelected = useCallback(() => {
    const confirmed = window.confirm(
      `Are you sure you want to add ${selectedItems.length} items to the blocklist? This will prevent future transactions from being created with these entities.`
    );
    if (!confirmed) return;

    mutateAsync({
      items: selectedItems.map((item) => ({
        listAlias: item.alias,
        value: item.value,
      })),
    })
      .then(() => {
        toast({
          title: "Success",
          description: "Added items to blocklist",
          status: "success",
        });
        onClose();
      })
      .catch((err) => {
        toast({
          title: `Error: ${err.message ?? "Unknown"}`,
          status: "error",
        });
        handleError(err);
      });
  }, [mutateAsync, onClose, selectedItems, toast]);

  return (
    <>
      <MenuItem onClick={onOpen}>Block Related Entities</MenuItem>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Block Related Entities</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={8}>
            <CheckboxGroup
              colorScheme="blue"
              defaultValue={["naruto", "kakashi"]}
              value={selectedItems.map((item) => item.tempId)}
            >
              <VStack align="start">
                {blockListItems?.map((item) => {
                  const listTitle = DEFAULT_BLOCKLISTS[item.alias].name;
                  return (
                    <Box
                      key={item.tempId}
                      px={3}
                      py={2}
                      bg="gray.50"
                      w="full"
                      wordBreak="break-word"
                      display="flex"
                    >
                      <Checkbox
                        value={item.tempId}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems([...selectedItems, item]);
                          } else {
                            setSelectedItems(
                              selectedItems.filter(
                                (selectedItem) =>
                                  selectedItem.tempId !== item.tempId
                              )
                            );
                          }
                        }}
                      >
                        <Box
                          w="full"
                          display="flex"
                          flexDirection="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Box flex={1} ml={2}>
                            <Text>
                              <Text display="inline" fontWeight="bold">
                                {item.value}
                              </Text>
                            </Text>
                            <Text fontSize="sm" color="gray.500">
                              add to{" "}
                              <Text display="inline" fontWeight="bold">
                                {listTitle}
                              </Text>
                              {/* {icon} */}
                            </Text>
                          </Box>
                        </Box>
                      </Checkbox>
                    </Box>
                  );
                })}
              </VStack>
            </CheckboxGroup>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="blue"
              mr={3}
              onClick={handleAddSelected}
              isLoading={isLoading}
            >
              Block selected items
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

type Row = NonNullable<
  RouterOutputs["dashboard"]["transactions"]["get"]
>["ruleExecutions"][number];

const columns: ColumnDef<Row>[] = [
  {
    header: "Executed Rule",
    accessorKey: "rule.name",
  },

  {
    header: "Risk Level",
    accessorKey: "riskLevel",
    cell: ({ row }) => {
      return <RiskLevelTag riskLevel={row.original.riskLevel} />;
    },
  },
];

const Page: CustomPage = () => {
  const router = useRouter();
  const transactionId = router.query.transactionId as string;

  const { isLoading, data } = api.dashboard.transactions.get.useQuery({
    id: transactionId,
  });

  if (!data) return null;

  //   const { data: transaction } = api.dashboard.transactions.get.useQuery({
  //     id: transactionId,
  //   });

  const customerDetails = [
    {
      label: "Name",
      value: (
        <Link as={NextLink} href={`/customers/${data.customer.id}`}>
          {data.paymentMethod.name}
        </Link>
      ),
    },
    {
      label: "Email",
      value: (
        <Link as={NextLink} href={`/customers/${data.customer.id}`}>
          {data.customer.email}
        </Link>
      ),
    },
    {
      label: "Payment",
      value: (
        <CardWithIcon
          last4={data.paymentMethod.card.last4}
          brand={data.paymentMethod.card.brand}
          wallet={data.paymentMethod.card.wallet}
        />
      ),
    },
  ];

  return (
    <Box>
      <Text mb={1} fontWeight="medium" fontSize="sm" color="subtle">
        Transaction
      </Text>

      <Flex justify="space-between" align="center">
        <HStack align="baseline" spacing={4}>
          <Heading mb={2}>
            {(data.amount / 100).toLocaleString("en-US", {
              style: "currency",
              currency: data.currency,
            })}{" "}
            {data.currency}
          </Heading>

          <Box>
            <Tooltip
              label={data.outcome?.sellerMessage}
              bgColor="white"
              fontWeight="medium"
              fontSize="sm"
              color="inherit"
              borderColor="gray.200"
              borderWidth={1}
              rounded="md"
              placement="bottom"
              hasArrow
              p={4}
            >
              <TransactionStatusTag
                status={data.outcome?.status || "incomplete"}
              />
            </Tooltip>
          </Box>
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
            <BlockTransaction transaction={data} />
          </MenuList>
        </Menu>
      </Flex>
      <HStack spacing={6} mb={2}>
        <Text color="gray.600" fontWeight="medium">
          {format(new Date(data.createdAt), "MMM dd, yyyy, h:mm a")}
        </Text>
        <Text color="gray.500">
          <Text userSelect="none" display="inline">
            ID:{" "}
          </Text>
          {data.id}
        </Text>
      </HStack>
      <HStack mb={2}></HStack>
      <Divider borderColor="gray.200" mb={2} />
      <Section title="Customer">
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
      </Section>

      <Section
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
            isLoading={isLoading}
          />
        )}
      </Section>
      <TransactionDetails transactionId={transactionId} />
      {/* <ViewTransaction transactionId={transactionId} /> */}
    </Box>
  );
};

Page.getLayout = (page) => <Layout>{page}</Layout>;

export default Page;

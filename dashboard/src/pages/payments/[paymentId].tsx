import {
  Box,
  Button,
  Checkbox,
  CheckboxGroup,
  Divider,
  Flex,
  HStack,
  Heading,
  Icon,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Tooltip,
  VStack,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { type ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/router";
import { CardWithIcon } from "~/components/card-with-icon/CardWithIcon";
import { DataTable } from "~/components/DataTable";
import { RiskLevelTag } from "~/components/RiskLevelTag";
import { PaymentStatusTag } from "~/components/PaymentStatusTag";
import { Layout } from "~/components/layouts/Layout";
import { Section, PaymentDetails } from "~/components/views/PaymentDetails";
import { type RouterOutputs, api } from "~/lib/api";
import { type CustomPage } from "../../types/Page";
import {
  CreditCard,
  Globe,
  Mail,
  MoreHorizontal,
  Phone,
  Wallet,
} from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import {
  DEFAULT_BLOCKLISTS,
  DefaultBlockListAlias,
} from "~/common/defaultBlocklists";
import { nanoid } from "nanoid";
import { handleError } from "~/lib/handleError";
import { format } from "date-fns";
import NextLink from "next/link";

type PaymentAttempt = RouterOutputs["dashboard"]["paymentAttempts"]["get"];
type BlockListItem = {
  tempId: string;
  alias: DefaultBlockListAlias;
  value: string;
};

function getBlockListItems(paymentAttempt: PaymentAttempt): BlockListItem[] {
  const items: BlockListItem[] = [];
  function addItem({
    value,
    alias,
  }: {
    alias: DefaultBlockListAlias;
    value: string | undefined | null;
  }) {
    if (value) {
      items.push({
        tempId: nanoid(),
        alias,
        value,
      });
    }
  }

  addItem({
    alias: DefaultBlockListAlias.EmailBlocklist,
    value: paymentAttempt?.customerLink?.customer.email,
  });
  addItem({
    alias: DefaultBlockListAlias.IpBlocklist,
    value: paymentAttempt?.checkoutSession.deviceSnapshot?.ipAddress.ipAddress,
  });
  addItem({
    alias: DefaultBlockListAlias.DeviceBlocklist,
    value: paymentAttempt?.checkoutSession.deviceSnapshot?.deviceId,
  });
  addItem({
    alias: DefaultBlockListAlias.CardFingerprintBlocklist,
    value: paymentAttempt?.paymentMethod.card?.fingerprint,
  });

  return items;
}

function BlockPayment(props: { paymentAttempt: PaymentAttempt }) {
  const { paymentAttempt } = props;

  const [selectedItems, setSelectedItems] = useState<BlockListItem[]>([]);
  const [blockListItems, setBlockListItems] = useState<BlockListItem[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure({
    onOpen: () => {
      const blockListItems = getBlockListItems(paymentAttempt);
      setSelectedItems(blockListItems);
      setBlockListItems(blockListItems);
    },
  });

  const { mutateAsync, isLoading } =
    api.dashboard.lists.addDefaultBlocklistItems.useMutation();
  const toast = useToast();
  const handleAddSelected = useCallback(() => {
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
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unsafe-member-access
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
  RouterOutputs["dashboard"]["paymentAttempts"]["get"]
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
  const paymentId = router.query.paymentId as string;

  const { isLoading, data: paymentAttemptData } =
    api.dashboard.paymentAttempts.get.useQuery({
      id: paymentId,
    });

  if (!paymentAttemptData) return null;

  const customerDetails = [
    {
      label: "Name",
      value: (
        <Link
          as={NextLink}
          href={`/customers/${
            paymentAttemptData.customerLink?.customer?.id ?? ""
          }`}
        >
          {paymentAttemptData.customerLink?.customer?.name ||
            paymentAttemptData.paymentMethod.name}
        </Link>
      ),
    },
    {
      label: "Email",
      value: (
        <Link
          as={NextLink}
          href={`/customers/${
            paymentAttemptData.customerLink?.customer?.id ?? ""
          }`}
        >
          {paymentAttemptData.customerLink?.customer?.email ?? "--"}
        </Link>
      ),
    },
    {
      label: "Payment",
      value: (
        <CardWithIcon
          last4={paymentAttemptData.paymentMethod.card?.last4}
          brand={paymentAttemptData.paymentMethod.card?.brand}
          wallet={paymentAttemptData.paymentMethod.cardWallet}
        />
      ),
    },
  ];

  return (
    <Box>
      <Text mb={1} fontWeight="medium" fontSize="sm" color="subtle">
        Payment
      </Text>

      <Flex justify="space-between" align="center">
        <HStack align="baseline" spacing={4}>
          <Heading mb={2}>
            {(paymentAttemptData.amount / 100).toLocaleString("en-US", {
              style: "currency",
              currency: paymentAttemptData.currency,
            })}
          </Heading>

          <Box>
            <Tooltip
              // label={paymentAttemptData.outcome?.sellerMessage}
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
              <PaymentStatusTag
                status={paymentAttemptData.outcome?.status || "incomplete"}
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
            <BlockPayment paymentAttempt={paymentAttemptData} />
          </MenuList>
        </Menu>
      </Flex>
      <HStack spacing={6} mb={2}>
        <Text color="gray.600" fontWeight="medium">
          {format(
            new Date(paymentAttemptData.createdAt),
            "MMM dd, yyyy, h:mm a"
          )}
        </Text>
        <Text color="gray.500">
          <Text userSelect="none" display="inline">
            ID:{" "}
          </Text>
          {paymentAttemptData.id}
        </Text>
      </HStack>
      <HStack mb={2}></HStack>
      <Divider borderColor="gray.200" mb={2} />
      <Section title="Customer">
        <HStack>
          {customerDetails.map((item) => (
            <Box key={item.label} fontSize="sm">
              <Text w={200} mb={1} color="subtle">
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
            <RiskLevelTag
              riskLevel={paymentAttemptData.assessment?.riskLevel}
            />
          </Box>
        }
      >
        {!paymentAttemptData?.ruleExecutions.length ? (
          <Flex justify="center" align="center">
            <Text fontSize="sm" color="subtle">
              No executed rules
            </Text>
          </Flex>
        ) : (
          <DataTable
            columns={columns}
            data={paymentAttemptData.ruleExecutions}
            showPagination={false}
            isLoading={isLoading}
          />
        )}
      </Section>
      <PaymentDetails paymentId={paymentId} />
    </Box>
  );
};

Page.getLayout = (page) => <Layout>{page}</Layout>;

export default Page;

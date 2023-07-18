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
import { MoreHorizontal } from "lucide-react";
import { useCallback, useState } from "react";
import {
  DEFAULT_BLOCKLISTS,
  DefaultBlockListAlias,
} from "~/common/defaultBlocklists";
import { nanoid } from "nanoid";
import { handleError } from "~/lib/handleError";
import { format } from "date-fns";
import NextLink from "next/link";
import { RuleModal } from "../../components/RuleModal";

type EvaluableAction = RouterOutputs["dashboard"]["evaluableActions"]["get"];
type BlockListItem = {
  tempId: string;
  alias: DefaultBlockListAlias;
  value: string;
};

function getBlockListItems(action: EvaluableAction): BlockListItem[] {
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
    value: action?.session.user?.email,
  });
  addItem({
    alias: DefaultBlockListAlias.IpBlocklist,
    value: action?.session.deviceSnapshot?.ipAddress?.ipAddress,
  });
  addItem({
    alias: DefaultBlockListAlias.DeviceBlocklist,
    value: action?.session.deviceSnapshot?.deviceId,
  });
  addItem({
    alias: DefaultBlockListAlias.CardFingerprintBlocklist,
    value: action?.paymentAttempt?.paymentMethod.card?.fingerprint,
  });

  return items;
}

function BlockPayment(props: { action: EvaluableAction }) {
  const { action } = props;

  const [selectedItems, setSelectedItems] = useState<BlockListItem[]>([]);
  const [blockListItems, setBlockListItems] = useState<BlockListItem[]>([]);
  const { isOpen, onOpen, onClose } = useDisclosure({
    onOpen: () => {
      const blockListItems = getBlockListItems(action);
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
  {
    header: "Rule Info",
    cell({ row }) {
      return <RuleModal ruleSnapshot={row.original.ruleSnapshot} />;
    },
  },
];

const Page: CustomPage = () => {
  const router = useRouter();
  const paymentId = router.query.paymentId as string;

  const toast = useToast();

  const { mutateAsync: evaluateAction } =
    api.dashboard.evaluableActions.evaluate.useMutation();

  const { isLoading, data: evaluableAction } =
    api.dashboard.evaluableActions.getByPaymentAttempt.useQuery({
      paymentAttemptId: paymentId,
    });

  if (!evaluableAction) return null;

  const deviceSnapshot = evaluableAction.session.deviceSnapshot;
  const paymentAttempt = evaluableAction.paymentAttempt;
  const paymentMethod = paymentAttempt?.paymentMethod;
  const user = evaluableAction.session.user;
  const session = evaluableAction.session;

  const userDetails = [
    {
      label: "Name",
      value: (
        <Link as={NextLink} href={`/users/${user?.id ?? ""}`}>
          {(user?.name || paymentMethod?.name) ?? "--"}
        </Link>
      ),
    },
    {
      label: "Email",
      value: (
        <Link as={NextLink} href={`/users/${user?.id ?? ""}`}>
          {(user?.email || paymentMethod?.email) ?? "--"}
        </Link>
      ),
    },
    {
      label: "Payment",
      value: (
        <CardWithIcon
          last4={paymentMethod?.card?.last4}
          brand={paymentMethod?.card?.brand}
          wallet={paymentMethod?.cardWallet}
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
            {paymentAttempt
              ? (paymentAttempt.amount / 100).toLocaleString("en-US", {
                  style: "currency",
                  currency: paymentAttempt.currency,
                })
              : "--"}
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
                status={paymentAttempt?.outcome?.status || "incomplete"}
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
            <BlockPayment action={evaluableAction} />
            <MenuItem
              onClick={() => {
                toast.promise(
                  evaluateAction({
                    evaluableActionId: evaluableAction.id,
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
          {format(new Date(evaluableAction?.createdAt), "MMM dd, yyyy, h:mm a")}
        </Text>
        <Text color="gray.500">
          <Text userSelect="none" display="inline">
            ID:{" "}
          </Text>
          {evaluableAction.id}
        </Text>
      </HStack>
      <HStack mb={2}></HStack>
      <Divider borderColor="gray.200" mb={2} />
      <Section title="User">
        <HStack>
          {userDetails.map((item) => (
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
            <RiskLevelTag riskLevel={evaluableAction?.riskLevel} />
          </Box>
        }
      >
        {!evaluableAction?.ruleExecutions.length ? (
          <Flex justify="center" align="center">
            <Text fontSize="sm" color="subtle">
              No executed rules
            </Text>
          </Flex>
        ) : (
          <DataTable
            columns={columns}
            data={evaluableAction.ruleExecutions}
            showPagination={false}
            isLoading={isLoading}
          />
        )}
      </Section>
      <PaymentDetails paymentId={paymentId} />
      <Section title="Raw Transforms Data">
        <Text fontFamily="mono" whiteSpace={"pre"} fontSize="sm">
          {JSON.stringify(evaluableAction.transformsOutput, null, 2)}
        </Text>
      </Section>
    </Box>
  );
};

Page.getLayout = (page) => <Layout>{page}</Layout>;

export default Page;

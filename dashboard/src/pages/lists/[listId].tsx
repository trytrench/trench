import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  HStack,
  Heading,
  Icon,
  IconButton,
  Input,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Portal,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import { type ColumnDef, type PaginationState } from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Layout } from "~/components/layouts/Layout";
import { api, type RouterOutputs } from "~/lib/api";
import { DataTable } from "../../components/DataTable";
import { type CustomPage } from "../../types/Page";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { IoEllipsisHorizontal } from "react-icons/io5";
import { useRouter } from "next/router";
import { format } from "date-fns";
import { Plus, Trash, Trash2 } from "lucide-react";

const columns: ColumnDef<
  NonNullable<RouterOutputs["dashboard"]["lists"]["get"]>["items"]
>[] = [
  { header: "Value", accessorKey: "value" },
  {
    header: "Author",
    accessorKey: "author",
  },
  {
    header: "Date added",
    accessorFn: (row) => format(row.createdAt, "MMMM d, y"),
  },
  {
    id: "actions",
    cell: () => (
      <IconButton aria-label="Delete" icon={<Icon as={Trash} />} size="sm" />
    ),
  },
];

const ListDetailsPage: CustomPage = () => {
  const router = useRouter();
  const toast = useToast();

  const [isOpen, setIsOpen] = useState(false);

  const { data: listData, refetch } = api.dashboard.lists.get.useQuery({
    id: router.query.listId as string,
  });

  const itemSchema = z.object({
    value: z
      .string()
      .nonempty("Required")
      .regex(new RegExp(listData?.regex), "Value doesn't match list regex"),
  });

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemSchema),
  });

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { mutate } = api.dashboard.lists.addItem.useMutation({
    onSuccess: () => {
      refetch();
      setIsOpen(false);
      toast({
        title: "Success",
        description: "Item created successfully",
        status: "success",
      });
    },
    onError: () => {
      toast({
        title: "Error creating item",
        // description: err.message,
        status: "error",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof itemSchema>) => {
    mutate({ ...data, listId: router.query.listId as string });
  };

  return (
    <Box>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add new item</ModalHeader>
          <ModalBody>
            <Stack as="form" onSubmit={handleSubmit(onSubmit)} spacing={4}>
              <FormControl isInvalid={!!errors.value}>
                <FormLabel htmlFor="value">Value</FormLabel>
                <Input
                  id="value"
                  placeholder="Item value"
                  {...register("value")}
                />
                <FormErrorMessage>
                  {errors.value && errors.value.message}
                </FormErrorMessage>
              </FormControl>

              <ModalFooter>
                <Button onClick={() => setIsOpen(false)} mr={2}>
                  Cancel
                </Button>
                <Button type="submit" colorScheme="blue">
                  Add
                </Button>
              </ModalFooter>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
      <Flex justify="space-between" align="center" mb={4}>
        <Heading>{listData?.name}</Heading>
        <Button
          leftIcon={<Icon as={Plus} />}
          size="sm"
          onClick={() => setIsOpen(true)}
        >
          Add
        </Button>
      </Flex>
      <HStack spacing={12} mb={6}>
        <Box>
          <Text variant="caption">Alias</Text>
          <Text fontSize="sm">{listData?.alias}</Text>
        </Box>

        <Box>
          <Text variant="caption">Author</Text>
          <Text fontSize="sm">{listData?.author}</Text>
        </Box>

        <Box>
          <Text variant="caption">Last modified</Text>
          {listData && (
            <Text fontSize="sm">{format(listData.updatedAt, "MMMM d, y")}</Text>
          )}
        </Box>
      </HStack>

      <DataTable
        columns={columns}
        data={listData?.items ?? []}
        onPaginationChange={setPagination}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={-1}
      />
    </Box>
  );
};

ListDetailsPage.getLayout = (page) => <Layout>{page}</Layout>;

export default ListDetailsPage;

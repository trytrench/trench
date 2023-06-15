import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
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
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { Plus } from "lucide-react";

const columns: ColumnDef<
  RouterOutputs["dashboard"]["lists"]["getAll"]["rows"][number]
>[] = [
  {
    header: "List",
    accessorKey: "name",
  },
  { header: "Items", accessorKey: "_count.items" },
  {
    header: "Created by",
    accessorKey: "author",
  },
  {
    header: "Last updated",
    accessorFn: (row) => format(row.updatedAt, "MMMM d, y"),
  },
  {
    id: "actions",
    meta: {
      disableLink: true,
    },
    cell: () => {
      return (
        <Menu>
          <MenuButton
            as={IconButton}
            aria-label="Options"
            icon={<Icon as={MoreHorizontal} />}
            size="xs"
          />
          <Portal>
            <MenuList>
              <MenuItem>Edit</MenuItem>
              <MenuItem>Delete</MenuItem>
            </MenuList>
          </Portal>
        </Menu>
      );
    },
  },
];

const ListsPage: CustomPage = () => {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const listSchema = z.object({
    name: z.string().nonempty("Required"),
    alias: z.string().nonempty("Required"),
    regex: z.string().optional(),
  });

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(listSchema),
  });

  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const {
    data: listsData,
    refetch,
    isLoading,
  } = api.dashboard.lists.getAll.useQuery({
    limit: pageSize,
    offset: pageIndex * pageSize,
  });

  const { mutate } = api.dashboard.lists.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsOpen(false);
      toast({
        title: "Success",
        description: "List created successfully",
        status: "success",
      });
    },
    onError: () => {
      toast({
        title: "Error creating list",
        // description: err.message,
        status: "error",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof listSchema>) => {
    mutate(data);
  };

  return (
    <Box>
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add new list</ModalHeader>
          <ModalBody>
            <Stack as="form" onSubmit={handleSubmit(onSubmit)} spacing={4}>
              <FormControl isInvalid={!!errors.name}>
                <FormLabel htmlFor="name">Name</FormLabel>
                <Input
                  id="name"
                  placeholder="Country blocklist"
                  {...register("name")}
                />
                <FormErrorMessage>
                  {errors.name && errors.name.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={!!errors.alias}>
                <FormLabel htmlFor="alias">Alias</FormLabel>
                <Input
                  id="alias"
                  placeholder="countryBlocklist"
                  {...register("alias")}
                />
                <FormErrorMessage>
                  {errors.alias && errors.alias.message}
                </FormErrorMessage>
              </FormControl>

              <FormControl isInvalid={errors.regex}>
                <FormLabel htmlFor="regex">Regex</FormLabel>
                <Input
                  id="regex"
                  placeholder="^[A-Za-z]{2}$"
                  {...register("regex")}
                />
                <FormErrorMessage>
                  {errors.regex && errors.regex.message}
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
      <Flex justify="space-between" mb={4} align="center">
        <Heading>Lists</Heading>
        <Button
          onClick={() => setIsOpen(true)}
          leftIcon={<Icon as={Plus} />}
          size="sm"
        >
          New
        </Button>
      </Flex>
      <DataTable
        columns={columns}
        data={listsData?.rows ?? []}
        onPaginationChange={setPagination}
        pageIndex={pageIndex}
        pageSize={pageSize}
        pageCount={Math.ceil((listsData?.count ?? 0) / pageSize)}
        getRowHref={(row) => `/lists/${row.original.id}`}
        isLoading={isLoading}
      />
    </Box>
  );
};

ListsPage.getLayout = (page) => <Layout>{page}</Layout>;

export default ListsPage;

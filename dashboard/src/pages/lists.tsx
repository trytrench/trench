import {
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Icon,
  IconButton,
  Input,
  Link,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Portal,
  Spacer,
  Tag,
  TagLabel,
  VStack,
} from "@chakra-ui/react";
import { ColumnDef, type PaginationState } from "@tanstack/react-table";
import { format } from "date-fns";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navbar } from "~/components/Navbar";
import { DataTable } from "~/components/data-table/DataTable";
import { RouterOutputs, api } from "~/utils/api";
import * as ScrollArea from "@radix-ui/react-scroll-area";

type Row = RouterOutputs["lists"]["getEventsOfType"]["rows"][number];
type FeatureColumn =
  RouterOutputs["lists"]["getFeatureColumnsForEventType"][number];

const checkboxColumn: ColumnDef<Row> = {
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
};

const labelColumn: ColumnDef<Row> = {
  header: "Labels",
  id: "label",
  cell: ({ row }) => {
    const labels = row.original.eventLabels;
    return (
      <HorzScroll>
        <HStack flexShrink={0}>
          {labels.map((label) => (
            <Tag colorScheme={label.color ?? "pink"} size="sm" px={1.5}>
              <TagLabel>{label.name}</TagLabel>
            </Tag>
          ))}
        </HStack>
      </HorzScroll>
    );
  },
};

const timestampColumn: ColumnDef<Row> = {
  header: "Timestamp",
  accessorFn: (row) => format(new Date(row.timestamp), "MMM d, p"),
};

const createFeatureColumn = (featureColumn: FeatureColumn) => {
  return {
    id: featureColumn.name,
    header: featureColumn.name,
    cell: ({ row }) => {
      const features = row.original.features as any; // uh
      return features[featureColumn.name] ?? "";
    },
    enableSorting: true,
    enableHiding: true,
    meta: {
      disableLink: true,
    },
  } as ColumnDef<Row>;
};

function HorzScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport>{children}</ScrollArea.Viewport>
      <ScrollArea.Scrollbar
        orientation="horizontal"
        className="flex select-none touch-none p-0.5 bg-black/20 transition-colors duration-[160ms] ease-out hover:bg-blackA8 data-[orientation=vertical]:w-2.5 data-[orientation=horizontal]:flex-col data-[orientation=horizontal]:h-2"
      >
        <ScrollArea.Thumb className="flex-1 bg-white/50 rounded-[10px] relative" />
      </ScrollArea.Scrollbar>
      <ScrollArea.Corner />
    </ScrollArea.Root>
  );
}

const Page = () => {
  const [list, setList] = useState("");

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 30,
  });
  const numSelected = Object.values(rowSelection).filter(Boolean).length;

  // Old Tables

  // const { data: eventsData, isLoading: _ } = api.events.findMany.useQuery({
  //   limit: pagination.pageSize,
  //   offset: pagination.pageIndex * pagination.pageSize,
  // });
  // const { data: kycData, isLoading: isKycDataLoading } =
  //   api.events.kycAttempts.useQuery({
  //     limit: pagination.pageSize,
  //     offset: pagination.pageIndex * pagination.pageSize,
  //   });

  const { data: eventTypesData } = api.labels.getEventTypes.useQuery();
  useEffect(() => {
    setList(eventTypesData?.[0]?.id ?? "");
  }, [eventTypesData]);

  const { data: featureColumnsData } =
    api.lists.getFeatureColumnsForEventType.useQuery({
      eventType: list,
    });

  const columns: ColumnDef<Row>[] = useMemo(
    () => [
      checkboxColumn,
      labelColumn,
      ...(featureColumnsData?.map(createFeatureColumn) ?? []),
      timestampColumn,
    ],
    [featureColumnsData]
  );

  const { data: eventsData, isLoading } = api.lists.getEventsOfType.useQuery({
    eventTypeId: list,
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
  });

  return (
    <>
      <Navbar />
      <Flex h="95vh" gap={6} p={4}>
        <Box minW={200}>
          <VStack
            spacing={2}
            divider={<Box height={"1px"} w={"100%"} bg="gray.200" />}
            borderColor="gray.200"
          >
            <HStack>
              <Input placeholder="Search" size="sm" />
              <IconButton
                size="xs"
                variant="ghost"
                aria-label="Save"
                icon={<Icon as={PlusCircle} fontSize="sm" />}
                onClick={() => {
                  // NOTHING HERE
                }}
              />
            </HStack>
            {eventTypesData?.map(({ id, name }) => (
              <Flex w="100%" key={id}>
                <Link
                  fontSize="sm"
                  fontWeight={list === id ? "bold" : "normal"}
                  onClick={() => {
                    setList(id);
                    setPagination({ ...pagination, pageIndex: 0 });
                  }}
                  isTruncated
                >
                  {name || "Untitled"}
                </Link>
                <Spacer />
                <Menu>
                  <MenuButton
                    as={IconButton}
                    size="xs"
                    variant="ghost"
                    aria-label="Save"
                    icon={<Icon as={MoreHorizontal} />}
                  />
                  <MenuList>
                    <MenuItem fontSize="sm">Rename</MenuItem>
                    <MenuItem fontSize="sm">Delete</MenuItem>
                  </MenuList>
                </Menu>
              </Flex>
            ))}
          </VStack>
        </Box>

        <DataTable
          rowHeight={9}
          data={eventsData?.rows ?? []}
          columns={columns}
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          pageCount={Math.ceil((eventsData?.count ?? 1) / pagination.pageSize)}
          onPaginationChange={setPagination}
          getRowHref={(row) => `/oops/${row.original.id}`}
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          isLoading={isLoading}
          header={
            <Box
              w="full"
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mr={4}
            >
              {numSelected > 0 && (
                <Menu placement="bottom-end">
                  <MenuButton
                    colorScheme={"blue"}
                    as={Button}
                    aria-label="Options"
                    size="sm"
                  >
                    Update ({numSelected})
                  </MenuButton>
                  <Portal>
                    <MenuList>{/* NOTHING HERE */}</MenuList>
                  </Portal>
                </Menu>
              )}
            </Box>
          }
          showColumnVisibilityOptions
        />
      </Flex>
    </>
  );
};

export default Page;

import {
  Badge,
  Card,
  Divider,
  List,
  ListItem,
  Metric,
  Select,
  SelectItem,
  Tab,
  TabGroup,
  TabList,
  TabPanel,
  TabPanels,
  Text,
  Title,
} from "@tremor/react";

import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import {
  DateParam,
  NumberParam,
  useQueryParam,
  useQueryParams,
} from "use-query-params";
import { DateRangePicker } from "~/components/DateRangePicker";
import EventsDashboard from "~/components/EventsDashboard";
import EntityEventsList from "~/components/EntityEventsList";
import { api } from "~/utils/api";
import { Navbar } from "../../../../components/Navbar";
import LinksView from "~/components/LinksView";
import { ListIcon } from "lucide-react";

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

interface RelatedEntitiesProps {
  entityId: string;
  datasetId: string;
}

function RelatedEntities({ entityId, datasetId }: RelatedEntitiesProps) {
  const [entityType, setEntityType] = useState<string>("");
  const { data: entityTypes } = api.labels.getEntityTypes.useQuery(
    {
      datasetId,
    },
    { enabled: !!datasetId }
  );

  return (
    <>
      <div className="flex items-center gap-4 grow">
        <Text className="whitespace-nowrap">Filter</Text>
        <Select
          enableClear
          className="w-40"
          value={entityType}
          onValueChange={setEntityType}
          placeholder="All entities"
        >
          {entityTypes?.map((et) => (
            <SelectItem key={et} value={et}>
              {et}
            </SelectItem>
          )) ?? []}
        </Select>
      </div>
      <Divider className="mb-0 mt-4" />
      <LinksView
        entityId={entityId ?? ""}
        datasetId={datasetId}
        leftTypeFilter={entityType}
        onLeftTypeFilterChange={setEntityType}
      />
    </>
  );
}

export default function Home() {
  const router = useRouter();
  const entityId = router.query.entityId as string;
  const datasetId = router.query.datasetId as string;

  const { data: entityData } = api.entities.get.useQuery(
    { id: entityId!, datasetId },
    { enabled: !!entityId }
  );

  const entityInfo = useMemo(
    () =>
      entityData
        ? {
            Type: entityData.type,
            Name: entityData.name,
            ID: entityData.id,
            // "First Seen": format(entityData.firstSeen, "yyyy-MM-dd HH:mm:ss"),
            // "Last Seen": format(entityData.lastSeen, "yyyy-MM-dd HH:mm:ss"),
          }
        : {},
    [entityData]
  );

  const [tab, setTab] = useQueryParam("tab", NumberParam);
  const [view, setView] = useState<"grid" | "list">("list");

  const [dateRange, setDateRange] = useQueryParams({
    from: DateParam,
    to: DateParam,
  });

  const entityLabels =
    entityData?.labels?.filter((label) => label !== "") ?? [];

  return (
    <>
      <Navbar />

      <main className="flex-1 h-0 flex flex-col">
        <div className="px-9 py-4 border-b-2 flex items-baseline gap-4 shrink-0">
          <Metric>{entityData?.name}</Metric>
          <Badge>Entity Type: {entityData?.type}</Badge>
        </div>
        <div className="grid grid-cols-4 flex-1 overflow-hidden">
          <div className="flex flex-col gap-4 bg-tremor-background-subtle p-4 overflow-y-auto">
            <Card>
              <div className="flex items-center justify-between w-full">
                <Title className="shrink-0">Entity Information</Title>
              </div>
              <div className="h-4"></div>
              <List>
                {Object.entries(entityInfo).map(([key, value]) => (
                  <ListItem key={key}>
                    <span>{key}</span>
                    <span className="ml-4 truncate">
                      <HorzScroll>{value}</HorzScroll>
                    </span>
                  </ListItem>
                ))}
              </List>
            </Card>
            <Card>
              <div className="flex items-center justify-between w-full">
                <Title className="shrink-0">Labels</Title>
              </div>
              <div className="h-4"></div>
              {entityLabels.length ? (
                <div className="flex flex-row flex-wrap">
                  {entityLabels.map((label) => (
                    <Badge key={label}>{label}</Badge>
                  ))}
                </div>
              ) : (
                <Text>None</Text>
              )}
            </Card>
            <Card>
              <div className="flex items-center justify-between w-full">
                <Title className="shrink-0">Data</Title>
              </div>
              <div className="h-4"></div>
              <List>
                {Object.entries(entityData?.features ?? {}).map(
                  ([key, value]) => (
                    <ListItem key={key}>
                      <span className="mr-8">{key}</span>
                      <span className="truncate">
                        <HorzScroll>{value}</HorzScroll>
                      </span>
                    </ListItem>
                  )
                )}
              </List>
            </Card>
          </div>
          <div className="flex flex-col col-span-3 p-4 pb-0 overflow-hidden h-full">
            <TabGroup
              className="flex flex-col h-full"
              index={tab ?? undefined}
              onIndexChange={(idx) => {
                setTab(idx);
              }}
            >
              <TabList>
                <Tab>Event Explorer</Tab>
                <Tab>Event History</Tab>
                <Tab>Related Entities</Tab>
              </TabList>
              <TabPanels className="p-2 overflow-y-auto grow">
                <TabPanel className="">
                  <div className="">
                    <div className="">
                      <DateRangePicker
                        value={dateRange}
                        onValueChange={(value) =>
                          setDateRange(
                            Object.keys(value).length
                              ? value
                              : { from: undefined, to: undefined }
                          )
                        }
                      />
                    </div>
                    <EventsDashboard
                      entityId={entityId}
                      datasetId={datasetId}
                    />
                  </div>
                </TabPanel>
                <TabPanel>
                  <EntityEventsList entityId={entityId} datasetId={datasetId} />
                </TabPanel>
                <TabPanel>
                  <div className="col-span-2">
                    <RelatedEntities
                      entityId={entityId}
                      datasetId={datasetId}
                    />
                  </div>
                </TabPanel>
              </TabPanels>
            </TabGroup>
          </div>
        </div>
      </main>
    </>
  );
}

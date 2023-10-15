import { Text, Title } from "@tremor/react";

import * as ScrollArea from "@radix-ui/react-scroll-area";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import {
  DateParam,
  NumberParam,
  StringParam,
  useQueryParam,
  useQueryParams,
} from "use-query-params";
import EventsDashboard from "~/components/EventsDashboard";
import EventsList from "~/components/EventsList";
import { api } from "~/utils/api";
import { Navbar } from "../../../components/Navbar";
import LinksView from "~/components/LinksView";
import { DatePickerWithRange } from "~/components/DRPicker";
import { Panel } from "~/components/ui/custom/panel";
import { Badge } from "~/components/ui/badge";
import { PropertyList } from "~/components/ui/custom/property-list";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "~/components/ui/custom/light-tabs";
import {
  ScrollBar,
  ScrollArea as ShadCNScrollArea,
} from "~/components/ui/scroll-area";
import { ClearableSelect } from "~/components/ui/custom/clearable-select";
import { Box } from "lucide-react";

// a

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
      <div className="flex items-center gap-4 grow px-2 pb-2 border-b">
        <span className="whitespace-nowrap text-sm">Filter</span>

        <ClearableSelect
          options={entityTypes?.map((et) => ({ label: et, value: et })) ?? []}
          onChange={(value: any) => {
            console.log("VALUE:", value);
            setEntityType((value?.value as string) ?? "");
          }}
          placeholder="All Entities"
          value={entityType ? { label: entityType, value: entityType } : null}
          isClearable={true}
        />
      </div>
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

  const [tab, setTab] = useQueryParam("tab", StringParam);
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
        <div className="px-12 py-6 border-b flex items-baseline gap-3 shrink-0 text-emphasis-foreground">
          <h1 className="text-2xl">{entityData?.name}</h1>
          <Badge className="-translate-y-0.5">
            Entity Type: {entityData?.type}
          </Badge>
        </div>
        <div className="grid grid-cols-4 flex-1 overflow-hidden">
          <div className="flex flex-col gap-4 p-4 overflow-y-auto bg-slate-50 border-r">
            <Panel>
              <h1 className="shrink-0 text-emphasis-foreground mb-2">
                Entity Information
              </h1>

              <PropertyList
                entries={Object.entries(entityInfo).map(([key, value]) => ({
                  label: key,
                  value: value as string,
                }))}
              />
            </Panel>
            <Panel>
              <h1 className="shrink-0 text-emphasis-foreground mb-2">Labels</h1>

              {entityLabels.length ? (
                <div className="flex flex-row flex-wrap">
                  {entityLabels.map((label) => (
                    <Badge key={label}>{label}</Badge>
                  ))}
                </div>
              ) : (
                <span className="italic text-muted-foreground text-sm">
                  None
                </span>
              )}
            </Panel>
            <Panel>
              <h1 className="shrink-0 text-emphasis-foreground mb-2">Data</h1>
              <PropertyList
                entries={Object.entries(entityData?.features ?? {}).map(
                  ([key, value]) => ({
                    label: key,
                    value: value as string,
                  })
                )}
              />
            </Panel>
          </div>
          <div className="flex flex-col col-span-3 p-4 py-2 overflow-hidden h-full">
            <Tabs
              defaultValue="explorer"
              className="flex flex-col grow"
              value={tab ?? "explorer"}
              onValueChange={setTab}
            >
              <TabsList className="w-full">
                <TabsTrigger value="explorer">Event Explorer</TabsTrigger>
                <TabsTrigger value="history">Event History</TabsTrigger>
                <TabsTrigger value="links">Related Entities</TabsTrigger>
              </TabsList>
              <TabsContent value="explorer">
                <div className="">
                  <DatePickerWithRange />
                  {/* <DateRangePicker
                        value={dateRange}
                        onValueChange={(value) =>
                          setDateRange(
                            Object.keys(value).length
                              ? value
                              : { from: undefined, to: undefined }
                          )
                        }
                      /> */}
                </div>
                {/* <EventsDashboard entityId={entityId} datasetId={datasetId} /> */}
              </TabsContent>
              <TabsContent value="history" className="relative grow mt-0">
                <EventsList entityId={entityId} datasetId={datasetId} />
              </TabsContent>
              <TabsContent value="links" className="relative grow">
                <RelatedEntities entityId={entityId} datasetId={datasetId} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </>
  );
}

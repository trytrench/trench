import { format } from "date-fns";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { type DateRange } from "react-day-picker";
import { StringParam, useQueryParam } from "use-query-params";
import AppLayout from "~/components/AppLayout";
import { DatePickerWithRange } from "~/components/DatePickerWithRange";
import EventsList from "~/components/EventsList";
import LinksView from "~/components/LinksView";
import { Badge } from "~/components/ui/badge";
import { ClearableSelect } from "~/components/ui/custom/clearable-select";
import { LabelList } from "~/components/ui/custom/label-list";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/custom/light-tabs";
import { Panel } from "~/components/ui/custom/panel";
import { PropertyList } from "~/components/ui/custom/property-list";
import { ScrollArea } from "~/components/ui/scroll-area";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";

interface RelatedEntitiesProps {
  entityId: string;
  entityType: string;
}

function RelatedEntities({ entityId, entityType }: RelatedEntitiesProps) {
  const [filterEntityType, setFilterEntityType] = useState<string>("");
  const { data: entityTypes } = api.labels.getEntityTypes.useQuery();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 px-2 pb-2 border-b">
        <span className="whitespace-nowrap text-sm">Filter</span>

        <ClearableSelect
          options={entityTypes?.map((et) => ({ label: et, value: et })) ?? []}
          onChange={(value: any) => {
            setFilterEntityType((value?.value as string) ?? "");
          }}
          placeholder="All Entities"
          value={
            filterEntityType
              ? { label: filterEntityType, value: filterEntityType }
              : null
          }
          isClearable={true}
        />
      </div>
      <div className="grow relative">
        <div className="absolute inset-0">
          <ScrollArea className="h-full pr-4">
            <LinksView
              entityId={entityId ?? ""}
              entityType={entityType}
              leftTypeFilter={filterEntityType}
              onLeftTypeFilterChange={setFilterEntityType}
            />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const entityId = decodeURIComponent(router.query.entityId as string);
  const entityType = router.query.entityType as string;

  const { data: entityDataRows } = api.lists.getEntitiesList.useQuery(
    {
      entityFilters: {
        entityId,
        entityType,
      },
    },
    {
      enabled: !!entityId && !!entityType,
    }
  );

  const entityData = entityDataRows?.rows[0];

  const entityInfo = useMemo(
    () =>
      entityData
        ? {
            Type: entityData.entityType,
            // Name: entityData.name,
            ID: entityData.entityId,
            "First Seen": format(entityData.firstSeenAt, "yyyy-MM-dd HH:mm:ss"),
            "Last Seen": format(entityData.lastSeenAt, "yyyy-MM-dd HH:mm:ss"),
          }
        : {},
    [entityData]
  );

  const [tab, setTab] = useQueryParam("tab", StringParam);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  return (
    <main className="flex-1 h-0 flex flex-col">
      <div className="px-12 py-6 border-b flex items-baseline gap-3 shrink-0 text-emphasis-foreground">
        <h1 className="text-2xl">{entityData?.entityId}</h1>
        <Badge className="-translate-y-0.5">
          Entity Type: {entityData?.entityType}
        </Badge>
      </div>
      <div className="grid grid-cols-4 flex-1">
        <div className="flex flex-col gap-4 p-4 overflow-y-auto bg-background border-r">
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
          {/* <Panel>
            <h1 className="shrink-0 text-emphasis-foreground mb-2">Labels</h1>

            {entityLabels.length ? (
              <div className="flex flex-row flex-wrap">
                {entityLabels.map((label) => (
                  <Badge key={label}>{label}</Badge>
                ))}
              </div>
            ) : (
              <span className="italic text-muted-foreground text-sm">None</span>
            )}
          </Panel> */}
          <Panel>
            <h1 className="shrink-0 text-emphasis-foreground mb-2">Data</h1>
            <PropertyList
              entries={
                entityData?.features.map((feature) => ({
                  label: feature.featureName,
                  value: feature.data.value,
                })) ?? []
              }
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
              {/* <TabsTrigger value="explorer">Event Explorer</TabsTrigger> */}
              <TabsTrigger value="history">Event History</TabsTrigger>
              <TabsTrigger value="links">Related Entities</TabsTrigger>
            </TabsList>
            {/* <TabsContent value="explorer">
              <div className="">
                <DatePickerWithRange
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                />
              </div>
              <EventsDashboard entityId={entityId} datasetId={datasetId} />
            </TabsContent> */}
            <TabsContent value="history" className="relative grow mt-0">
              <EventsList entityId={entityId} />
            </TabsContent>
            <TabsContent value="links" className="relative grow">
              <RelatedEntities entityId={entityId} entityType={entityType} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

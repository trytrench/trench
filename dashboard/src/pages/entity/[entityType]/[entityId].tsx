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
import {
  RenderResult,
  RenderTypedData,
} from "../../../components/RenderResult";
import { EntityPageEditor } from "../../../components/entity-page/EntityPageEditor";
import { useEntityName } from "~/hooks/useEntityName";

type Option = {
  label: string;
  value: string;
};
interface RelatedEntitiesProps {
  entityId: string;
  entityType: string;
}

function RelatedEntities({ entityId, entityType }: RelatedEntitiesProps) {
  const [filterEntityType, setFilterEntityType] = useState<Option | undefined>(
    undefined
  );
  const { data: entityTypes } = api.entityTypes.list.useQuery();

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 px-2 pb-2 border-b">
        <span className="whitespace-nowrap text-sm">Filter</span>

        <ClearableSelect
          options={
            entityTypes?.map((et) => ({ label: et.type, value: et.id })) ?? []
          }
          onChange={(value) => {
            setFilterEntityType((value as Option) ?? undefined);
          }}
          placeholder="All Entities"
          value={filterEntityType}
          isClearable={true}
        />
      </div>
      <div className="grow relative">
        <div className="absolute inset-0">
          <ScrollArea className="h-full pr-4">
            <LinksView
              entityId={entityId ?? ""}
              entityType={entityType}
              leftTypeFilter={filterEntityType?.value ?? ""}
              onLeftTypeFilterChange={(newValue) => {
                const eType = entityTypes?.find((et) => et.id === newValue);
                setFilterEntityType(
                  eType ? { label: eType.type, value: eType.id } : undefined
                );
              }}
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
  const entityType = decodeURIComponent(router.query.entityType as string);

  const { data: entityDataRows } = api.lists.getEntitiesList.useQuery(
    { entityFilters: { entityId, entityType } },
    { enabled: !!entityId && !!entityType }
  );

  const entity = useMemo(() => entityDataRows?.rows[0], [entityDataRows]);
  const { entityName, entityTypeName } = useEntityName(entity);

  const entityInfo = useMemo(
    () =>
      entity
        ? {
            Type: entityTypeName,
            // Name: entityData.name,
            ID: entity.entityId,
            "First Seen": format(entity.firstSeenAt, "yyyy-MM-dd HH:mm:ss"),
            "Last Seen": format(entity.lastSeenAt, "yyyy-MM-dd HH:mm:ss"),
          }
        : {},
    [entity, entityTypeName]
  );

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const [tab, setTab] = useQueryParam("tab", StringParam);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  return (
    <main className="h-full flex flex-col">
      <div className="px-12 py-6 border-b flex items-baseline gap-3 shrink-0 text-emphasis-foreground">
        <h1 className="text-2xl">{entityName ?? entity?.entityId}</h1>
        <Badge className="-translate-y-0.5">{entityTypeName}</Badge>
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
                entity?.features.map((feature) => ({
                  label: feature.featureName,
                  value: <RenderResult result={feature.result} />,
                })) ?? []
              }
            />
          </Panel>
        </div>
        <div className="flex flex-col col-span-3 p-4 py-2 overflow-hidden h-full">
          <Tabs
            defaultValue="history"
            className="flex flex-col grow"
            value={tab ?? "history"}
            onValueChange={setTab}
          >
            <TabsList className="w-full">
              {/* <TabsTrigger value="explorer">Event Explorer</TabsTrigger> */}
              <TabsTrigger value="history">Event History</TabsTrigger>
              <TabsTrigger value="links">Related Entities</TabsTrigger>
              <TabsTrigger value="page">Custom Page</TabsTrigger>
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
              <EventsList
                entity={{
                  id: entityId,
                  type: entityType,
                }}
              />
            </TabsContent>
            <TabsContent value="links" className="relative grow">
              <RelatedEntities entityId={entityId} entityType={entityType} />
            </TabsContent>
            <TabsContent value="page" className="relative grow">
              <EntityPageEditor />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

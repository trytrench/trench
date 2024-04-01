import { format } from "date-fns";
import { TypeName } from "event-processing";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { type DateRange } from "react-day-picker";
import { StringParam, useQueryParam } from "use-query-params";
import AppLayout from "~/components/AppLayout";
import { EntityList } from "~/components/EntityList";
import EventCharts from "~/components/EventCharts";
import EventsList from "~/components/EventsList";
import { FeatureGrid } from "~/components/FeatureGrid";
import LinksView from "~/components/LinksView";
import { Card } from "~/components/ui/card";
import { ClearableSelect } from "~/components/ui/custom/clearable-select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/custom/light-tabs";
import { Panel } from "~/components/ui/custom/panel";
import { ScrollArea } from "~/components/ui/scroll-area";
import { useDecision } from "~/hooks/useDecision";
import { useEntityNameMap } from "~/hooks/useEntityNameMap";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import { customDecodeURIComponent } from "../../../lib/uri";
import { Badge } from "../../../components/ui/badge";
import { FeatureSuccess } from "../../../shared/types";
import { EntityFilter, EntityFilterType } from "../../../shared/validation";
import { useEntityPageSubject } from "../../../hooks/useEntityPageSubject";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { Analysis } from "../../../components/Analysis";

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
  const [filterEventType, setFilterEventType] = useState<Option | undefined>(
    undefined
  );

  const { data: entityTypes } = api.entityTypes.list.useQuery();
  const { data: eventTypes } = api.eventTypes.list.useQuery();

  return (
    <div className="h-full">
      <div className="flex items-center gap-4 px-8 py-2 border-b">
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

        <ClearableSelect
          options={
            eventTypes?.map((et) => ({ label: et.id, value: et.id })) ?? []
          }
          onChange={(value) => {
            setFilterEventType((value as Option) ?? undefined);
          }}
          placeholder="All Events"
          value={filterEventType}
          isClearable={true}
        />
      </div>

      <ScrollArea className="px-8">
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
          eventType={filterEventType?.value ?? ""}
        />
      </ScrollArea>
    </div>
  );
}

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const entityId = customDecodeURIComponent(router.query.entityId as string);
  const entityTypeName = customDecodeURIComponent(
    router.query.entityType as string
  );

  const { data: entityTypes } = api.entityTypes.list.useQuery();

  const entTypeObj = entityTypes?.find((et) => et.type === entityTypeName);
  const entityTypeId = entTypeObj?.id;

  const filters = useMemo(() => {
    const arr: EntityFilter[] = [];
    if (entityId) {
      arr.push({ type: EntityFilterType.EntityId, data: entityId });
    }
    if (entityTypeId) {
      arr.push({ type: EntityFilterType.EntityType, data: entityTypeId });
    }
    return arr;
  }, [entityId, entityTypeId]);
  const { data: entityDataRows } = api.lists.getEntitiesList.useQuery(
    { entityFilters: filters },
    { enabled: !!entityId && !!entityTypeId }
  );

  const entity = useMemo(() => entityDataRows?.rows[0], [entityDataRows]);

  const entityNameMap = useEntityNameMap(
    entity?.features
      .filter(
        (feature) =>
          feature.result.type === "success" &&
          feature.result.data.schema.type === TypeName.Entity
      )
      .map((feature) => {
        const data = (feature.result as FeatureSuccess).data;
        return `${data.value.type}_${data.value.id}`;
      }) ?? []
  );
  const decision = useDecision(entity?.features ?? []);

  const subjectEntity = useEntityPageSubject();

  const [tab, setTab] = useQueryParam("tab", StringParam);

  const { isMd } = useBreakpoint("md");

  return (
    <main className="h-full flex flex-col">
      <div className="px-4 md:px-8 py-3 md:py-6 flex flex-wrap items-baseline gap-0.5 md:gap-1 w-full">
        <h1 className="text-lg md:text-2xl text-emphasis-foreground truncate">
          {entity?.entityName}
        </h1>
        <Badge className="whitespace-nowrap ml-1">{entityTypeName}</Badge>
        {/* <Badge className="-translate-y-0.5">{entityTypeName}</Badge> */}
        {/* {decision && <RenderDecision decision={decision} />} */}
      </div>

      <Tabs
        defaultValue="history"
        className="flex-grow flex flex-col relative overflow-hidden"
        value={tab ?? "overview"}
        onValueChange={setTab}
      >
        <TabsList className="px-2 md:px-8 shrink-0 bg-background z-10 w-full overflow-x-auto">
          {/* <TabsTrigger value="explorer">Event Explorer</TabsTrigger> */}
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="links">Related Entities</TabsTrigger>
          <TabsTrigger value="history">Event History</TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
          {/* <TabsTrigger value="page">Custom Page</TabsTrigger> */}
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
        <TabsContent value="overview" className="mt-0 overflow-auto flex-grow">
          <div className="flex flex-col gap-4 px-2 md:px-8 py-4 overflow-y-auto bg-background border-r">
            {entity && (
              <Panel className="overflow-x-auto">
                <div className="text-muted-foreground text-sm">
                  First Seen: {format(entity.firstSeenAt, "MMM d, yyyy h:mm a")}
                </div>
                <div className="text-muted-foreground text-sm mb-4">
                  Last Seen: {format(entity.lastSeenAt, "MMM d, yyyy h:mm a")}
                </div>
                <FeatureGrid
                  features={entity.features ?? []}
                  entityNameMap={entityNameMap}
                  cols={isMd ? 5 : 2}
                />
                <div className="h-8" />
              </Panel>
            )}
            {entity && (
              <Panel className="overflow-auto">
                <EventCharts
                  entity={{ id: entity.entityId, type: entity.entityType }}
                />
              </Panel>
            )}
          </div>
        </TabsContent>
        <TabsContent value="history" className="flex-grow mt-0 overflow-y-auto">
          {entityId && entityTypeId && (
            <EventsList
              entity={{
                id: entityId,
                type: entityTypeId,
              }}
            />
          )}
        </TabsContent>
        <TabsContent
          value="entities"
          className="flex-grow mt-0 overflow-y-auto"
        >
          {entityId && entityTypeId && (
            <EntityList seenWithEntity={subjectEntity} />
          )}
        </TabsContent>
        <TabsContent value="links" className="flex-grow mt-0">
          {isMd ? (
            entityId &&
            entityTypeId && (
              <RelatedEntities entityId={entityId} entityType={entityTypeId} />
            )
          ) : (
            <div className="p-4">
              Please move to a desktop to view related entities.
            </div>
          )}
        </TabsContent>
        {/* <TabsContent value="page" className="h-full mt-0">
          <EntityPageEditor />
        </TabsContent> */}
        <TabsContent
          value="analysis"
          className="flex-grow mt-0 overflow-y-auto"
        >
          <Analysis />
        </TabsContent>
      </Tabs>
    </main>
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

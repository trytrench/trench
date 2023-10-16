import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { StringParam, useQueryParam } from "use-query-params";
import { DatePickerWithRange } from "~/components/DRPicker";
import EventsList from "~/components/EventsList";
import LinksView from "~/components/LinksView";
import { Badge } from "~/components/ui/badge";
import { ClearableSelect } from "~/components/ui/custom/clearable-select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "~/components/ui/custom/light-tabs";
import { Panel } from "~/components/ui/custom/panel";
import { PropertyList } from "~/components/ui/custom/property-list";
import { type NextPageWithLayout } from "~/pages/_app";
import { api } from "~/utils/api";
import AppLayout from "~/components/AppLayout";
import { ScrollArea } from "~/components/ui/scroll-area";

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
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 px-2 pb-2 border-b">
        <span className="whitespace-nowrap text-sm">Filter</span>

        <ClearableSelect
          options={entityTypes?.map((et) => ({ label: et, value: et })) ?? []}
          onChange={(value: any) => {
            setEntityType((value?.value as string) ?? "");
          }}
          placeholder="All Entities"
          value={entityType ? { label: entityType, value: entityType } : null}
          isClearable={true}
        />
      </div>
      <div className="grow relative">
        <div className="absolute inset-0">
          <ScrollArea className="h-full pr-4">
            <LinksView
              entityId={entityId ?? ""}
              datasetId={datasetId}
              leftTypeFilter={entityType}
              onLeftTypeFilterChange={setEntityType}
            />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}

const Page: NextPageWithLayout = () => {
  const router = useRouter();
  const entityId = router.query.entityId as string;
  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );
  const datasetId = useMemo(
    () => project?.prodDatasetId?.toString(),
    [project]
  );

  const { data: entityData } = api.entities.get.useQuery(
    { id: entityId, datasetId: datasetId! },
    { enabled: !!entityId && !!datasetId }
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

  const entityLabels =
    entityData?.labels?.filter((label) => label !== "") ?? [];

  return (
    <main className="flex-1 h-0 flex flex-col">
      <div className="px-12 py-6 border-b flex items-baseline gap-3 shrink-0 text-emphasis-foreground">
        <h1 className="text-2xl">{entityData?.name}</h1>
        <Badge className="-translate-y-0.5">
          Entity Type: {entityData?.type}
        </Badge>
      </div>
      <div className="grid grid-cols-4 flex-1">
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
              <span className="italic text-muted-foreground text-sm">None</span>
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
  );
};

Page.getLayout = (page) => <AppLayout>{page}</AppLayout>;

export default Page;

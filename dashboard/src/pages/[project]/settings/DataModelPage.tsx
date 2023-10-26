import clsx from "clsx";
import { keyBy } from "lodash";
import {
  Asterisk,
  EyeIcon,
  Hash,
  Loader2Icon,
  LucideIcon,
  PencilIcon,
  ToggleLeft,
  Type,
} from "lucide-react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { FeatureList } from "~/components/FeatureList";
import { FeatureListItem } from "~/components/FeatureListItem";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "~/components/ui/command";
import { Panel } from "~/components/ui/custom/panel";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Separator } from "~/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { api } from "~/utils/api";

const RuleCard = ({ feature, dataType, onChange }: FeatureCardProps) => {
  const [value, setValue] = useState(dataType);

  const dataTypeToIcon = {
    text: Type,
    number: Hash,
    boolean: ToggleLeft,
  } as Record<string, LucideIcon>;

  const Icon = dataTypeToIcon[value] ?? Asterisk;

  return (
    <div className="flex items-center w-full justify-between gap-2 px-2 pt-1.5">
      <div className="mr-auto">{feature}</div>

      {/* <Icon className="w-4 h-4" /> */}
      {/* <Select
        value={value}
        onValueChange={(value) => {
          setValue(value);
          mutateAsync({ id: feature, name: feature, dataType: value });
          onChange(value);
        }}
      >
        <SelectTrigger className="w-36 h-8">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="text">Text</SelectItem>
          <SelectItem value="number">Number</SelectItem>
          <SelectItem value="boolean">Boolean</SelectItem>
        </SelectContent>
      </Select> */}
      <PencilIcon className="w-4 h-4 cursor-pointer" />
      <EyeIcon className="w-4 h-4 cursor-pointer" />
    </div>
  );
};

const EVENT_PREFIX = "EVENT-";
const ENTITY_PREFIX = "ENTITY-";

function DataModelPage() {
  const router = useRouter();
  const { mutateAsync } = api.features.saveFeatureMetadata.useMutation();

  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.project as string },
    { enabled: !!router.query.project }
  );
  const datasetId = useMemo(
    () => project?.prodDatasetId?.toString(),
    [project]
  );

  const { data: dataset } = api.datasets.get.useQuery(
    { id: datasetId! },
    { enabled: !!datasetId }
  );

  const { data: allEntities } = api.labels.getEntityTypes.useQuery(
    { datasetId: datasetId! },
    { enabled: !!datasetId }
  );
  const { data: allEvents } = api.labels.getEventTypes.useQuery(
    { datasetId: datasetId! },
    { enabled: !!datasetId }
  );

  const { data: features } = api.labels.getFeatures.useQuery(
    { datasetId: datasetId! },
    { enabled: !!datasetId }
  );

  const { data: eventFeatures } = api.labels.getFeatures.useQuery(
    { datasetId: datasetId! },
    { enabled: !!datasetId }
  );

  // const { data: allFeatures, isLoading: allFeaturesLoading } =
  //   api.labels.allFeatures.useQuery({ datasetId }, { enabled: !!datasetId });

  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // when the page loads, select the first entity type
  // useEffect(() => {
  //   if (Object.keys(entityFeatures ?? {})[0] && !selectedItemType) {
  //     setSelectedItemType(`ENTITY-${Object.keys(entityFeatures ?? {})[0]}`);
  //   }
  // }, [allFeaturesLoading]);

  const {
    data: featureMetadata,
    isLoading: featureMetadataLoading,
    refetch,
  } = api.features.getFeatureMetadata.useQuery();

  const featureToMetadata = useMemo(
    () => keyBy(featureMetadata, "feature"),
    [featureMetadata]
  );

  const [searchValue, setSearchValue] = useState("");

  return (
    <>
      <h1 className="text-2xl mb-1 text-emphasis-foreground">Data Model</h1>
      <div className="text-muted-foreground">Configure feature data types.</div>
      <Separator className="my-8" />

      <div className="flex gap-4">
        <div className="w-[14rem] pl-2 text-sm text-gray-700">
          {/* Entity List */}
          <div className="font-semibold mb-2">Entities</div>
          <div className="">
            {allEntities ? (
              allEntities.map((type) => (
                <button
                  key={type}
                  className={clsx({
                    "px-4 py-1 active:bg-blue-100 w-full text-left rounded-md transition flex justify-between items-center":
                      true,
                    "bg-accent text-accent-foreground":
                      selectedItem === ENTITY_PREFIX + type,
                    "hover:bg-muted": selectedItem !== ENTITY_PREFIX + type,
                  })}
                  onClick={() => {
                    setSelectedItem(ENTITY_PREFIX + type);
                    setSearchValue("");
                  }}
                >
                  {type}
                  <span className="text-xs text-muted-foreground">
                    {/* {entityFeatures?.[type]?.length ?? 0} */}
                  </span>
                </button>
              ))
            ) : (
              <Loader2Icon className="animate-spin w-4 h-4 text-muted-foreground mx-auto opacity-50" />
            )}
          </div>

          {/* Event List */}
          <div className="font-semibold mb-2 mt-4">Events</div>
          <div className="">
            {allEvents ? (
              allEvents.map((type) => (
                <button
                  key={type}
                  className={clsx({
                    "px-4 py-1 active:bg-blue-100 w-full text-left rounded-md transition flex justify-between items-center":
                      true,
                    "bg-accent text-accent-foreground":
                      selectedItem === EVENT_PREFIX + type,
                    "hover:bg-muted": selectedItem !== EVENT_PREFIX + type,
                  })}
                  onClick={() => {
                    setSelectedItem(EVENT_PREFIX + type);
                    setSearchValue("");
                  }}
                >
                  {type}
                  <span className="text-xs text-muted-foreground">
                    {eventFeatures?.[type]?.length ?? 0}
                  </span>
                </button>
              ))
            ) : (
              <Loader2Icon className="animate-spin w-4 h-4 text-muted-foreground mx-auto opacity-50" />
            )}
          </div>
        </div>
        <div className="grow">
          <Tabs defaultValue="features">
            <TabsList>
              <TabsTrigger value="features">Features</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
            </TabsList>
            <TabsContent value="features">
              <Panel className=" h-[30rem] flex flex-col p-4 pt-2">
                <Command className="relative">
                  <CommandInput
                    placeholder="Search features..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <ScrollArea className="pr-1">
                    {/* 1000rem so the CommandList doesn't create its own scrollbar */}
                    <CommandList className="max-h-none">
                      <CommandGroup>
                        {features?.length > 0 && (
                          <FeatureList
                            onFeatureChange={(value, item) => {
                              console.log(value, item);
                              mutateAsync({
                                feature: item.id,
                                ...item.metadata,
                                ...value,
                                releaseId: dataset?.releaseId,
                              })
                                .then(() => refetch())
                                .catch((error) => console.log(error));
                            }}
                            items={features
                              .map((feature) => ({
                                id: feature,
                                metadata: featureToMetadata[feature],
                              }))
                              .filter(
                                ({ metadata }) =>
                                  !metadata?.isRule && !metadata?.hidden
                              )}
                          />
                        )}
                        {/* {features && !featureMetadataLoading ? (
                          features
                            .filter(
                              (feature) =>
                                !featureToMetadata[feature]?.isRule &&
                                !featureToMetadata[feature]?.hidden
                            )
                            .map((feature) => (
                              <CommandItem
                                key={feature}
                                className="aria-selected:bg-card aria-selected:text-card-foreground p-0 last:mb-4"
                              >
                                {getFeature(feature)}
                              </CommandItem>
                            ))
                        ) : (
                          <Loader2Icon className="animate-spin w-4 h-4 text-muted-foreground mx-auto opacity-50" />
                        )} */}
                      </CommandGroup>
                      <CommandSeparator />
                      <CommandGroup heading="Hidden">
                        {/* {features && !featureMetadataLoading ? (
                          features
                            .filter(
                              (feature) =>
                                !featureToMetadata[feature]?.isRule &&
                                featureToMetadata[feature]?.hidden
                            )
                            .map((feature) => (
                              <CommandItem
                                key={feature}
                                className="aria-selected:bg-card aria-selected:text-card-foreground p-0 last:mb-4"
                              >
                                {getFeature(feature)}
                              </CommandItem>
                            ))
                        ) : (
                          <Loader2Icon className="animate-spin w-4 h-4 text-muted-foreground mx-auto opacity-50" />
                        )} */}
                      </CommandGroup>
                    </CommandList>
                  </ScrollArea>
                  {/* <CommandEmpty>
                    No features found for this entity type.
                  </CommandEmpty> */}

                  {/* Bottom gradient; right-2 so we don't cover the scrollbar. */}
                  <div className="absolute bottom-0 left-0 right-2 bg-gradient-to-t from-card h-4"></div>
                </Command>
              </Panel>
            </TabsContent>
            <TabsContent value="rules">
              <Panel className=" h-[30rem] flex flex-col p-4 pt-2">
                <Command className="relative">
                  <CommandInput
                    placeholder="Search features..."
                    value={searchValue}
                    onValueChange={setSearchValue}
                  />
                  <ScrollArea className="pr-1">
                    {/* 1000rem so the CommandList doesn't create its own scrollbar */}
                    <CommandList className="max-h-none">
                      {features && !featureMetadataLoading ? (
                        features
                          .filter(
                            (feature) =>
                              featureMetadata?.find(
                                (f) => f.feature === feature
                              )?.isRule
                          )
                          .map((feature) => (
                            <CommandItem
                              key={feature}
                              className="aria-selected:bg-card aria-selected:text-card-foreground p-0 last:mb-4"
                            >
                              <RuleCard
                                key={feature}
                                feature={feature}
                                dataType={
                                  featureMetadata?.find((f) => f.id === feature)
                                    ?.dataType ?? "text"
                                }
                                onChange={() => {
                                  refetch();
                                }}
                              />
                            </CommandItem>
                          ))
                      ) : (
                        <Loader2Icon className="animate-spin w-4 h-4 text-muted-foreground mx-auto opacity-50" />
                      )}
                    </CommandList>
                  </ScrollArea>
                  <CommandEmpty>
                    No features found for this entity type.
                  </CommandEmpty>

                  {/* Bottom gradient; right-2 so we don't cover the scrollbar. */}
                  <div className="absolute bottom-0 left-0 right-2 bg-gradient-to-t from-card h-4"></div>
                </Command>
              </Panel>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}

export default DataModelPage;

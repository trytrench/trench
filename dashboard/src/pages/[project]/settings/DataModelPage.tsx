import clsx from "clsx";
import { sortBy } from "lodash";
import { Loader2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { FeatureList } from "~/components/FeatureList";
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

const EVENT_PREFIX = "EVENT-";
const ENTITY_PREFIX = "ENTITY-";

interface Props {
  projectId: string;
}

function DataModelPage({ projectId }: Props) {
  const { mutateAsync: saveFeature } = api.features.saveFeature.useMutation();
  const { mutateAsync: saveEntityFeature } =
    api.features.saveEntityFeature.useMutation();

  const { data: eventTypes } = api.labels.getEventTypes.useQuery({ projectId });

  const { data: entityTypes, refetch: refetchEntityTypes } =
    api.labels.getEntityTypes.useQuery({
      projectId,
    });

  const { data: features, refetch: refetchFeatures } =
    api.labels.getFeatures.useQuery({ projectId });

  const { data: eventFeatures } = api.labels.getEventFeatures.useQuery({
    projectId,
  });

  const { data: entityFeatures } = api.labels.getEntityFeatures.useQuery({
    projectId,
  });

  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const allFeatures = useMemo(() => {
    if (!selectedItem) return [];

    if (selectedItem === "all") return features;

    if (selectedItem.startsWith(ENTITY_PREFIX)) {
      const entityType = entityTypes.find(
        (entityType) => entityType.type === selectedItem.split("-")[1]
      );
      return sortBy(
        features.map((feature) => {
          const entityFeature = entityFeatures.find(
            (entityFeature) => entityFeature.featureId === feature.id
          );

          return {
            ...feature,
            hidden: !entityType?.featureOrder.includes(feature.id),
            name: entityFeature?.name ?? feature.feature,
          };
        }),
        (feature) => entityType?.featureOrder.indexOf(feature.id)
      );
    }

    if (selectedItem.startsWith(EVENT_PREFIX)) {
      const eventType = entityTypes.find(
        (eventType) => eventType.type === selectedItem.split("-")[1]
      );
      return features.map((feature) => {
        const entityFeature = entityFeatures.find(
          (entityFeature) => entityFeature.featureId === feature.id
        );

        return {
          ...feature,
          hidden: !eventType?.featureOrder.includes(feature.feature),
          name: entityFeature?.name ?? feature.feature,
        };
      });
    }

    return [];
  }, [selectedItem, entityFeatures, entityTypes, features]);

  const shownFeatures = useMemo(() => {
    return allFeatures.filter((feature) => !feature.hidden && !feature.isRule);
  }, [allFeatures]);

  const hiddenFeatures = useMemo(() => {
    return allFeatures.filter((feature) => feature.hidden && !feature.isRule);
  }, [allFeatures]);

  // when the page loads, select the first entity type
  // useEffect(() => {
  //   if (Object.keys(entityFeatures ?? {})[0] && !selectedItemType) {
  //     setSelectedItemType(`ENTITY-${Object.keys(entityFeatures ?? {})[0]}`);
  //   }
  // }, [allFeaturesLoading]);

  const { mutateAsync: saveEntityFeatureOrder } =
    api.features.saveEntityFeatureOrder.useMutation();

  const { mutateAsync: saveEventFeatureOrder } =
    api.features.saveEventFeatureOrder.useMutation();

  const [searchValue, setSearchValue] = useState("");

  return (
    <>
      <h1 className="text-2xl mb-1 text-emphasis-foreground">Data Model</h1>
      <div className="text-muted-foreground">Configure feature data types.</div>
      <Separator className="my-8" />

      <div className="flex gap-4">
        <div className="w-[14rem] pl-2 text-sm text-gray-700">
          <div className="font-semibold mb-2">Features</div>
          <button
            className={clsx({
              "px-4 py-1 active:bg-blue-100 w-full text-left rounded-md transition flex justify-between items-center":
                true,
              "bg-accent text-accent-foreground": selectedItem === "all",
              "hover:bg-muted": selectedItem !== "all",
            })}
            onClick={() => {
              setSelectedItem("all");
            }}
          >
            All
            <span className="text-xs text-muted-foreground">
              {/* {entityFeatures?.[type]?.length ?? 0} */}
            </span>
          </button>

          {/* Entity List */}
          <div className="font-semibold mb-2 mt-4">Entities</div>
          <div className="">
            {entityTypes ? (
              entityTypes.map(({ type }) => (
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
            {eventTypes ? (
              eventTypes.map(({ type }) => (
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
                  {/* <span className="text-xs text-muted-foreground">
                    {eventFeatures?.[type]?.length ?? 0}
                  </span> */}
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
                    {!features?.length && (
                      // !sortedHiddenFeatures.length && (
                      <CommandEmpty>No features</CommandEmpty>
                    )}
                    <CommandList className="max-h-none">
                      <CommandGroup>
                        {features && (
                          <FeatureList
                            features={shownFeatures}
                            onDataTypeChange={
                              selectedItem !== "all"
                                ? undefined
                                : (dataType, feature) => {
                                    saveFeature({
                                      featureId: feature.id,
                                      dataType,
                                    })
                                      .then(refetchFeatures)
                                      .catch((error) => console.log(error));
                                  }
                            }
                            onRename={
                              selectedItem === "all"
                                ? undefined
                                : (name, feature) =>
                                    saveEntityFeature({
                                      featureId: feature.id,
                                      entityTypeId: entityTypes?.find(
                                        (type) =>
                                          type.type ===
                                          selectedItem?.split("-")[1]
                                      ).id,
                                      name,
                                    })
                            }
                            onOrderChange={
                              selectedItem === "all"
                                ? undefined
                                : (features) => {
                                    saveEntityFeatureOrder({
                                      features,
                                      projectId,
                                      entityType: selectedItem?.split("-")[1],
                                    }).catch((error) => console.log(error));
                                  }
                            }
                            onToggleHide={
                              selectedItem === "all"
                                ? undefined
                                : (hidden, item) => {
                                    saveEntityFeatureOrder({
                                      features: shownFeatures
                                        .map((f) => f.id)
                                        .filter((f) => f !== item.id),
                                      entityType: selectedItem?.split("-")[1],
                                      projectId,
                                    })
                                      .then(refetchEntityTypes)
                                      .catch((error) => console.log(error));
                                  }
                            }
                          />
                        )}
                      </CommandGroup>
                      {hiddenFeatures.length > 0 && (
                        <>
                          <CommandSeparator />
                          <CommandGroup heading="Hidden">
                            <FeatureList
                              features={hiddenFeatures}
                              onFeatureChange={(value, item) => {
                                mutateAsync({
                                  feature: item.id,
                                  name: item.metadata?.name ?? undefined,
                                  dataType: item.metadata?.dataType ?? "text",
                                  ...value,
                                  releaseId: dataset?.releaseId,
                                })
                                  .then(() => refetch())
                                  .catch((error) => console.log(error));
                              }}
                              onRename={
                                selectedItem === "all"
                                  ? undefined
                                  : (name, feature) =>
                                      saveEntityFeature({
                                        featureId: feature.id,
                                        entityTypeId: entityTypes?.find(
                                          (type) =>
                                            type.type ===
                                            selectedItem?.split("-")[1]
                                        ).id,
                                        name,
                                      })
                              }
                              onToggleHide={(hidden, item) => {
                                saveEntityFeatureOrder({
                                  features: shownFeatures
                                    .map((f) => f.id)
                                    .concat(item.id),
                                  entityType: selectedItem?.split("-")[1],
                                  projectId,
                                })
                                  .then(refetchEntityTypes)
                                  .catch((error) => console.log(error));
                              }}
                            />
                          </CommandGroup>
                        </>
                      )}
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
                      {features ? (
                        features
                          .filter((feature) => !feature.isRule)
                          .map((feature) => (
                            <CommandItem
                              key={feature}
                              className="aria-selected:bg-card aria-selected:text-card-foreground p-0 last:mb-4"
                            >
                              {/* <RuleCard
                                key={feature}
                                feature={feature}
                                dataType={
                                  featureMetadata?.find((f) => f.id === feature)
                                    ?.dataType ?? "text"
                                }
                                onChange={() => {
                                  refetch();
                                }}
                              /> */}
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

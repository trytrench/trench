import { Card, Divider, Icon, Text, Title } from "@tremor/react";
import clsx from "clsx";
import {
  Asterisk,
  Hash,
  LucideIcon,
  ToggleLeft,
  Type,
  TypeIcon,
} from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import { Panel } from "~/components/ui/custom/panel";
import { ScrollArea } from "~/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Separator } from "~/components/ui/separator";
import { api } from "~/utils/api";

interface FeatureCardProps {
  feature: string;
  dataType: string;
  onChange: (value: string) => void;
}

const FeatureCard = ({ feature, dataType, onChange }: FeatureCardProps) => {
  const { mutateAsync } = api.features.saveFeatureMetadata.useMutation();
  const [value, setValue] = useState(dataType);

  const dataTypeToIcon = {
    text: Type,
    number: Hash,
    boolean: ToggleLeft,
  } as Record<string, LucideIcon>;

  const Icon = dataTypeToIcon[value] ?? Asterisk;

  return (
    <div className="flex items-center w-full justify-between gap-2 px-2 pt-1.5">
      <Icon className="w-4 h-4" />
      <div className="mr-auto">{feature}</div>

      <Select
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
      </Select>
    </div>
  );
};

function DataModelPage() {
  const router = useRouter();
  const { data: project } = api.project.getByName.useQuery(
    { name: router.query.projectName as string },
    { enabled: !!router.query.projectName }
  );
  const datasetId = useMemo(
    () => project?.prodDatasetId?.toString(),
    [project]
  );

  const { data: allEntities, isLoading: allEntitiesLoading } =
    api.labels.getEntityTypes.useQuery({ datasetId }, { enabled: !!datasetId });
  const { data: allEvents, isLoading: allEventsLoading } =
    api.labels.getEventTypes.useQuery({ datasetId }, { enabled: !!datasetId });

  const { data: allFeatures, isLoading: allFeaturesLoading } =
    api.labels.allFeatures.useQuery({ datasetId }, { enabled: !!datasetId });

  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);

  const entityFeatures = allFeatures?.entities;
  const eventFeatures = allFeatures?.events;

  // when the page loads, select the first entity type
  useEffect(() => {
    if (Object.keys(entityFeatures ?? {})[0] && !selectedItemType) {
      setSelectedItemType(`ENTITY-${Object.keys(entityFeatures ?? {})[0]}`);
    }
  }, [allFeaturesLoading]);

  const {
    data: featureMetadata,
    isLoading: featureMetadataLoading,
    refetch,
  } = api.features.getFeatureMetadata.useQuery();

  const featureList = useMemo(() => {
    if (!selectedItemType) return [];
    if (selectedItemType.startsWith("ENTITY-")) {
      const entityName = selectedItemType.substring("ENTITY-".length);
      return entityFeatures?.[entityName] ?? [];
    } else {
      const eventName = selectedItemType.substring("EVENT-".length);
      return eventFeatures?.[eventName] ?? [];
    }
  }, [selectedItemType, entityFeatures, eventFeatures]);

  const [searchValue, setSearchValue] = useState("");

  return (
    <>
      <h1 className="text-2xl mb-1 text-emphasis-foreground">Data Model</h1>
      <div className="text-muted-foreground">Configure feature data types.</div>
      <Separator className="my-8" />

      <div className="flex gap-4">
        <div className="w-[14rem] pl-2 text-sm text-gray-700">
          <div className="font-semibold mb-2">Entities</div>
          <div className="">
            {allEntities?.map((type) => (
              <button
                className={clsx({
                  "px-4 py-1 active:bg-blue-100 w-full text-left rounded-md transition flex justify-between items-center":
                    true,
                  "bg-accent text-accent-foreground":
                    selectedItemType === `ENTITY-${type}`,
                  "hover:bg-muted": selectedItemType !== `ENTITY-${type}`,
                })}
                onClick={() => {
                  setSelectedItemType(`ENTITY-${type}`);
                  setSearchValue("");
                }}
              >
                {type}
                <span className="text-xs text-mited-foreground">
                  {entityFeatures?.[type]?.length ?? 0}
                </span>
              </button>
            ))}
          </div>
          <div className="font-semibold mb-2 mt-4">Events</div>
          <div className="">
            {allEvents?.map((type) => (
              <button
                className={clsx({
                  "px-4 py-1 active:bg-blue-100 w-full text-left rounded-md transition flex justify-between items-center":
                    true,
                  "bg-accent text-accent-foreground":
                    selectedItemType === `EVENT-${type}`,
                  "hover:bg-muted": selectedItemType !== `EVENT-${type}`,
                })}
                onClick={() => {
                  setSelectedItemType(`EVENT-${type}`);
                  setSearchValue("");
                }}
              >
                {type}
                <span className="text-xs text-mited-foreground">
                  {eventFeatures?.[type]?.length ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="grow">
          <Panel className=" h-[30rem] flex flex-col p-4 pt-2">
            <Command className="relative">
              <CommandInput
                placeholder="Search features..."
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <ScrollArea className="pr-1">
                <CommandList className="max-h-[1000rem]">
                  {featureList.map(({ feature: feature }) => (
                    <CommandItem className="aria-selected:bg-card aria-selected:text-card-foreground p-0">
                      <FeatureCard
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
                  ))}
                </CommandList>
              </ScrollArea>
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-b from-transparent to-card h-4"></div>
              <CommandEmpty>
                No features found for this entity type.
              </CommandEmpty>
            </Command>
          </Panel>
        </div>
      </div>
    </>
  );
}

export default DataModelPage;

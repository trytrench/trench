import {
  Card,
  Divider,
  Icon,
  Select,
  SelectItem,
  Text,
  Title,
} from "@tremor/react";
import clsx from "clsx";
import {
  Asterisk,
  Hash,
  LucideIcon,
  ToggleLeft,
  Type,
  TypeIcon,
} from "lucide-react";
import { use, useEffect, useMemo, useState } from "react";
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

  return (
    <div className="flex items-center py-1 gap-2">
      <Icon icon={dataTypeToIcon[value] ?? Asterisk} color="gray" />
      <Text className="mr-auto text-black">{feature}</Text>
      <span>
        <Select
          className="mt-1"
          value={value}
          onValueChange={(value) => {
            setValue(value);
            mutateAsync({ id: feature, name: feature, dataType: value });
            onChange(value);
          }}
        >
          <SelectItem value="text">Text</SelectItem>
          <SelectItem value="number">Number</SelectItem>
          <SelectItem value="boolean">Boolean</SelectItem>
        </Select>
      </span>
    </div>
  );
};

function DataModelPage() {
  const [selectedItemType, setSelectedItemType] = useState<string | null>(null);

  const { data: allFeatures, isLoading: allFeaturesLoading } =
    api.labels.allFeatures.useQuery();

  const entityFeatures = allFeatures?.entities;
  const eventFeatures = allFeatures?.events;

  // when the page loads, select the first entity type
  useEffect(() => {
    if (Object.keys(entityFeatures ?? {})[0] && !selectedItemType) {
      setSelectedItemType(`ENTITY-${Object.keys(entityFeatures ?? {})[0]}`);
    }
  }, [allFeaturesLoading]);

  const entityTypes = Object.keys(entityFeatures ?? {});
  const eventTypes = Object.keys(eventFeatures ?? {});

  const {
    data: featureMetadata,
    isLoading: featureMetadataLoading,
    refetch,
  } = api.features.getFeatureMetadata.useQuery();

  useEffect(() => {
    console.log(entityFeatures);
  }, [entityTypes]);

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

  const [scrolled, setScrolled] = useState(false);

  return (
    <>
      <Title className="text-xl mb-1">Data Model</Title>
      <Text>Configure entity feature data types.</Text>
      <Divider />

      <div className="flex gap-4">
        <div className="w-[14rem] pl-2 text-sm text-gray-700">
          <Text className="font-bold mb-2">Entities</Text>
          <div className="font-mono">
            {entityTypes?.map((type) => (
              <button
                className={clsx({
                  "pl-4 p-1 active:bg-blue-100 w-full text-left rounded-md transition":
                    true,
                  "bg-blue-100": selectedItemType === `ENTITY-${type}`,
                  "hover:bg-blue-50": selectedItemType !== `ENTITY-${type}`,
                })}
                onClick={() => {
                  setSelectedItemType(`ENTITY-${type}`);
                }}
              >
                {type}
              </button>
            ))}
          </div>
          <Text className="font-bold mb-2 mt-4">Events</Text>
          <div className="font-mono">
            {eventTypes?.map((type) => (
              <button
                className={clsx({
                  "pl-4 p-1 active:bg-blue-100 w-full text-left rounded-md transition":
                    true,
                  "bg-blue-100": selectedItemType === `EVENT-${type}`,
                  "hover:bg-blue-50": selectedItemType !== `ENTITY-${type}`,
                })}
                onClick={() => {
                  setSelectedItemType(`EVENT-${type}`);
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
        <div className="grow">
          <Card className=" h-[30rem] flex flex-col">
            <Title
              className={`pb-2 border-b transition ${
                scrolled ? "" : "border-transparent"
              }`}
            >
              Features ({featureList.length})
            </Title>
            <div
              className="grow overflow-y-auto"
              onScroll={(e) => {
                setScrolled(e.currentTarget.scrollTop > 0);
              }}
            >
              {featureList.map(({ feature: feature }) => (
                <FeatureCard
                  key={feature}
                  feature={feature}
                  dataType={
                    featureMetadata?.find((f) => f.id === feature)?.dataType ??
                    "text"
                  }
                  onChange={() => {
                    refetch();
                  }}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

export default DataModelPage;

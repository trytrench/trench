import {
  Box,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
  Skeleton,
} from "@chakra-ui/react";

import {
  Badge,
  Button,
  Card,
  Flex,
  Icon,
  MultiSelect,
  NumberInput,
  Select,
  SelectItem,
  Text,
  Title,
} from "@tremor/react";
import { format } from "date-fns";
import Link from "next/link";
import { useState } from "react";
import {
  ArrayParam,
  JsonParam,
  StringParam,
  useQueryParam,
  withDefault,
} from "use-query-params";
import { Navbar } from "~/components/Navbar";
import { RouterOutputs, api } from "~/utils/api";

import { JsonFilterOp } from "~/shared/jsonFilter";
import { ChevronLeft, Hash, Type } from "lucide-react";
import FeatureFilter, { Filter } from "~/components/FeatureFilter";

function EntityCard({
  entity,
}: {
  entity: RouterOutputs["lists"]["getEntitiesList"]["rows"][number];
}) {
  return (
    <Card>
      <div className="">
        <Link href={`/entity/${entity.id}`}>
          <Title className="">
            {entity.type}: {entity.name}
          </Title>
        </Link>
        <Text>
          Last seen: {format(new Date(entity.lastSeenAt), "MMM d, yyyy h:mm a")}
        </Text>
        <div className="h-4"></div>
        <div className="flex flex-wrap gap-1">
          {entity.labels.length > 0 ? (
            entity.labels.map((label, idx) => {
              return (
                <Badge key={idx} color={label.color}>
                  {label.name}
                </Badge>
              );
            })
          ) : (
            <Badge color="neutral">No labels</Badge>
          )}
        </div>
        <div className="h-4"></div>
        <SimpleGrid columns={5} spacing={2}>
          {Object.entries(entity.features).map(([key, value], idx) => (
            <Box key={key}>
              <Text className="font-semibold">{key}</Text>
              <Text className="truncate">
                {value === 0
                  ? 0
                  : value === true
                  ? "True"
                  : value === false
                  ? "False"
                  : value || "-"}
              </Text>
            </Box>
          ))}
        </SimpleGrid>
      </div>
    </Card>
  );
}

const useFilters = () => {
  const [type, setType] = useQueryParam("type", StringParam);
  const [sortBy, setSortBy] = useQueryParam<{
    feature: string;
    direction: string;
    dataType: string;
  }>(
    "sortBy",
    withDefault(JsonParam, {
      feature: "lastSeenAt",
      direction: "desc",
      dataType: "string",
    })
  );
  const [features, setFeatures] = useQueryParam<Filter[]>(
    "features",
    withDefault(JsonParam, [])
  );
  const [labels, setLabels] = useQueryParam(
    "labels",
    withDefault(ArrayParam, [])
  );

  return {
    type,
    setType,
    sortBy,
    setSortBy,
    features,
    setFeatures,
    labels,
    setLabels,
  };
};

const Filters = ({
  types,
  labels,
  features,
}: {
  types: { id: string; name: string }[];
  labels: { id: string; name: string }[];
  features: { name: string; dataType: string }[];
}) => {
  const {
    type,
    setType,
    sortBy,
    setSortBy,
    features: featureFilters,
    setFeatures: setFeatureFilters,
    labels: selectedLabels,
    setLabels: setSelectedLabels,
  } = useFilters();

  return (
    <>
      <Text className="font-semibold text-lg mb-2 mt-6">Type</Text>
      <Select value={type ?? ""} onChange={setType}>
        {types.map((type) => (
          <SelectItem value={type.id} key={type.id}>
            {type.name}
          </SelectItem>
        ))}
      </Select>

      <Text className="font-semibold text-lg mb-2 mt-6">Labels</Text>

      <MultiSelect value={selectedLabels} onValueChange={setSelectedLabels}>
        {labels.map((label) => (
          <SelectItem key={label.id} value={label.id}>
            {label.name}
          </SelectItem>
        ))}
      </MultiSelect>

      <Text className="font-semibold text-lg mb-2 mt-6">Filter</Text>
      <div className="flex flex-col gap-2">
        <FeatureFilter
          features={features}
          onAddFilter={(filter) =>
            setFeatureFilters([...featureFilters, filter])
          }
        />
        {featureFilters.map((filter, index) => (
          <Badge
            key={index}
            onClick={() =>
              setFeatureFilters(featureFilters.filter((f) => filter !== f))
            }
          >
            {filter.path} {filter.op} {filter.value}
          </Badge>
        ))}
      </div>

      <Text className="font-semibold text-lg mb-2 mt-6">Sort by</Text>
      <div className="flex flex-col gap-2">
        <Select
          value={sortBy.feature}
          onValueChange={(value) => {
            setSortBy({
              feature: value,
              dataType:
                features.find((feature) => feature.name === value)?.dataType ??
                "string",
              direction: "desc",
            });
          }}
        >
          {features.map((feature) => (
            <SelectItem
              value={feature.name}
              key={feature.name}
              icon={feature.dataType === "number" ? Hash : Type}
            >
              {feature.name}
            </SelectItem>
          ))}
        </Select>
        <style global jsx>
          {`
            .tremor-SelectItem-icon {
              height: 1rem;
              width: 1rem;
            }
          `}
        </style>
      </div>
      <Button
        className="mt-6"
        size="xs"
        onClick={() => {
          setFeatureFilters([]);
          setSelectedLabels([]);
          setSortBy({
            feature: "lastSeenAt",
            direction: "desc",
            dataType: "string",
          });
        }}
      >
        Clear filters
      </Button>
    </>
  );
};

function EntitiesPage() {
  const { type, labels, features, sortBy } = useFilters();

  const { data: entityTypes, isLoading: entityTypesLoading } =
    api.labels.getEntityTypes.useQuery();

  const { data: entityLabels, isLoading: entityLabelsLoading } =
    api.labels.getEntityLabels.useQuery({
      entityType: type,
    });

  const { data: entityFeatures, isLoading: entityFeaturesLoading } =
    api.labels.getEntityFeatures.useQuery({
      entityType: type,
    });

  const { data: entitiesList } = api.lists.getEntitiesList.useQuery({
    entityFilters: {
      entityType: type,
      entityLabels: labels,
      entityFeatures: features,
    },
    sortBy,
    limit: 100,
  });

  return (
    <>
      <div className="flex-1 overflow-hidden flex items-stretch">
        <div className="w-96 shrink-0 flex flex-col items-start bg-tremor-background-muted p-8 border-r border-r-tremor-border">
          <Title>Entities</Title>
          {entityFeaturesLoading ||
          entityLabelsLoading ||
          entityTypesLoading ? (
            <Skeleton />
          ) : (
            <Filters
              types={entityTypes}
              labels={entityLabels}
              features={entityFeatures}
            />
          )}
        </div>
        <div className="relative flex-1">
          <div className="h-full flex flex-wrap gap-4 p-8 overflow-y-auto">
            {entitiesList?.rows.map((entity) => {
              return <EntityCard key={entity.id} entity={entity} />;
            })}
          </div>
          <div className="absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-white pointer-events-none"></div>
        </div>
      </div>
    </>
  );
}

function Page() {
  return (
    <>
      <Navbar />
      <EntitiesPage />
    </>
  );
}

export default Page;

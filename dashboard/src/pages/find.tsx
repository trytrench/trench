import {
  Box,
  Button,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  SimpleGrid,
} from "@chakra-ui/react";

import {
  Badge,
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

function EntitiesPage() {
  const [entityType, setEntityType] = useQueryParam("entityType", StringParam);
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
  const [filters, setFilters] = useQueryParam<Filter[]>(
    "filters",
    withDefault(JsonParam, [])
  );
  const [selectedEntityLabels, setSelectedEntityLabels] = useQueryParam<
    string[]
  >("entityLabels", withDefault(ArrayParam, []));
  // const [filters, setFilters] = useQueryParam(
  //   "filters",
  //   withDefault(ArrayParam, [])
  // );

  const { data: entityTypes } = api.labels.getEntityTypes.useQuery();

  const { data: entityLabels } = api.labels.getEntityLabels.useQuery({
    entityType: entityType ?? undefined,
  });

  const { data: entityFeatures } = api.labels.getEntityFeatures.useQuery({
    entityType: entityType ?? undefined,
  });

  const { data: entitiesList } = api.lists.getEntitiesList.useQuery({
    entityFilters: {
      entityType: entityType ?? undefined,
      entityLabels: selectedEntityLabels,
      entityFeatures: filters,
    },
    sortBy,
    limit: 100,
  });

  return (
    <>
      <div className="flex-1 overflow-hidden flex items-stretch">
        <div className="w-96 shrink-0 flex flex-col items-start bg-tremor-background-muted p-8 border-r border-r-tremor-border">
          <Title>Entities</Title>

          <Text className="font-semibold text-lg mb-2 mt-6">Type</Text>
          <Select
            value={entityType}
            onChange={(value) => {
              setEntityType(value);
            }}
          >
            {entityTypes?.map((type) => (
              <SelectItem value={type.id} key={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </Select>

          {entityType && (
            <>
              <Text className="font-semibold text-lg mb-2 mt-6">Labels</Text>

              <MultiSelect
                value={entityLabels ? selectedEntityLabels : []}
                onValueChange={setSelectedEntityLabels}
              >
                {entityLabels?.map((label) => (
                  <SelectItem key={label.id} value={label.id}>
                    {label.name}
                  </SelectItem>
                ))}
              </MultiSelect>

              <Text className="font-semibold text-lg mb-2 mt-6">Filter</Text>
              <div className="flex flex-col gap-2">
                <FeatureFilter
                  features={entityFeatures || []}
                  onAddFilter={(filter) => setFilters([...filters, filter])}
                />
                {filters.map((filter, index) => (
                  <Badge
                    key={index}
                    onClick={() =>
                      setFilters(filters.filter((f) => filter !== f))
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
                      ...sortBy,
                      feature: value,
                      dataType:
                        entityFeatures?.find(
                          (feature) => feature.name === value
                        )?.dataType || "string",
                    });
                  }}
                >
                  {entityFeatures?.map((feature) => (
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
            </>
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

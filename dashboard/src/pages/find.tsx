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
  MultiSelect,
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
  StringParam,
  useQueryParam,
  withDefault,
} from "use-query-params";
import { Navbar } from "~/components/Navbar";
import { RouterOutputs, api } from "~/utils/api";

import { JsonFilterOp } from "~/shared/jsonFilter";
import { useDatasetSelectionStore } from "~/lib/datasetSelectionState";

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
  const [sortBy, setSortBy] = useQueryParam("sortBy", StringParam);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState([]);
  const [selectedEntityLabels, setSelectedEntityLabels] = useQueryParam<
    string[]
  >("entityLabels", withDefault(ArrayParam, []));
  const [selectedFilterFeature, setSelectedFilterFeature] = useState<
    string | null
  >(null);
  // const [filters, setFilters] = useQueryParam(
  //   "filters",
  //   withDefault(ArrayParam, [])
  // );

  const datasetId = useDatasetSelectionStore((state) => state.selection);

  const { data: entityTypes } = api.labels.getEntityTypes.useQuery({
    datasetId,
  });

  const { data: entityLabels } = api.labels.getEntityLabels.useQuery({
    entityType: entityType ?? undefined,
    datasetId,
  });

  const { data: entityFeatures } = api.labels.getEntityFeatures.useQuery({
    entityType: entityType ?? undefined,
    datasetId,
  });

  const { data: entitiesList } = api.lists.getEntitiesList.useQuery({
    entityFilters: {
      entityType: entityType ?? undefined,
      entityLabels: selectedEntityLabels,
      entityFeatures: filters,
    },
    sortBy: {
      feature: sortBy,
      direction: "desc",
    },
    limit: 100,
    datasetId,
  });

  const filterOptions = [
    {
      label: "Is empty",
      value: {
        path: selectedFilterFeature,
        op: JsonFilterOp.Equal,
        value: "NULL",
      },
    },
    {
      label: "Not empty",
      value: {
        path: selectedFilterFeature,
        op: JsonFilterOp.NotEqual,
        value: "NULL",
      },
    },
  ];

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
                <Menu
                  isOpen={filterOpen || !!selectedFilterFeature}
                  onClose={() => {
                    if (selectedFilterFeature) setSelectedFilterFeature(null);
                    setFilterOpen(false);
                  }}
                >
                  <MenuButton
                    as={Button}
                    size="sm"
                    onClick={() => setFilterOpen(true)}
                  >
                    Add filter
                  </MenuButton>
                  <MenuList>
                    {selectedFilterFeature ? (
                      <>
                        {filterOptions.map((option) => (
                          <MenuItem
                            key={option.label}
                            onClick={() => {
                              setFilters([...filters, option.value]);
                            }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </>
                    ) : (
                      entityFeatures?.map((feature) => (
                        <MenuItem
                          key={feature.name}
                          onClick={() => setSelectedFilterFeature(feature.name)}
                        >
                          {feature.name}
                        </MenuItem>
                      ))
                    )}
                  </MenuList>
                </Menu>
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
                  value={sortBy}
                  onChange={(value) => {
                    setSortBy(value);
                  }}
                >
                  {entityFeatures?.map((feature) => (
                    <SelectItem value={feature.name} key={feature.name}>
                      {feature.name}
                    </SelectItem>
                  ))}
                </Select>
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

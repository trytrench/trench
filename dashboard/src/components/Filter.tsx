import {
  Badge,
  Button,
  MultiSelect,
  Select,
  SelectItem,
  Text,
} from "@tremor/react";
import {
  ArrayParam,
  JsonParam,
  StringParam,
  useQueryParam,
  withDefault,
} from "use-query-params";
import { Hash, Type } from "lucide-react";
import FeatureFilter, {
  type FeatureFilterType,
} from "~/components/FeatureFilter";

export const useFilters = () => {
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
  const [features, setFeatures] = useQueryParam<FeatureFilterType[]>(
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

export const Filter = ({
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

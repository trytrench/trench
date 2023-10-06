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
import { Hash, Type, XCircle } from "lucide-react";
import FeatureFilter, {
  type FeatureFilterType,
} from "~/components/FeatureFilter";

export const useFilters = () => {
  const [type, setType] = useQueryParam("type", StringParam);
  const [sortBy, setSortBy] = useQueryParam<{
    feature: string;
    direction: string;
    dataType: string;
  }>("sortBy", JsonParam);
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

interface Props {
  types: string[];
  labels: string[];
  features: { feature: string; dataType: string }[];
}

export const Filter = ({ types, labels, features }: Props) => {
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
          <SelectItem value={type} key={type}>
            {type}
          </SelectItem>
        ))}
      </Select>

      <Text className="font-semibold text-lg mb-2 mt-6">Labels</Text>

      <MultiSelect value={selectedLabels} onValueChange={setSelectedLabels}>
        {labels?.map((label) => (
          <SelectItem key={label} value={label}>
            {label}
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
            icon={XCircle}
            className="cursor-pointer"
          >
            <style global jsx>
              {`
                .tremor-Badge-icon {
                  height: 0.8rem;
                  width: 0.8rem;
                }
              `}
            </style>
            {filter.path} {filter.op} {filter.value}
          </Badge>
        ))}
      </div>

      <Text className="font-semibold text-lg mb-2 mt-6">Sort by</Text>
      <div className="flex flex-col gap-2">
        <Select
          value={sortBy?.feature || ""}
          onValueChange={(value) => {
            setSortBy({
              feature: value,
              dataType:
                features.find((feature) => feature.feature === value)
                  ?.dataType ?? "string",
              direction: "desc",
            });
          }}
        >
          {features.map((feature) => (
            <SelectItem
              value={feature.feature}
              key={feature.feature}
              icon={feature.dataType === "number" ? Hash : Type}
            >
              {feature.feature}
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

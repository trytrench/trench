import {
  Button,
  Card,
  Flex,
  Icon,
  NumberInput,
  SelectItem,
  Text,
  TextInput,
} from "@tremor/react";
import { useMemo, useState } from "react";

import { Popover } from "@headlessui/react";
import { Select } from "@trytrench/tremor";
import { ChevronLeft } from "lucide-react";
import { JsonFilterOp } from "~/shared/jsonFilter";

export type Filter = {
  path: string;
  op: JsonFilterOp;
  value: number;
};

interface Props {
  features: { name: string; dataType: string }[];
  onAddFilter: (filter: Filter) => void;
}

export default function FeatureFilter({ features, onAddFilter }: Props) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [filterValue, setFilterValue] = useState("");
  const [filterOp, setFilterOp] = useState("");

  const selectedFeatureDataType = useMemo(
    () =>
      features.find((feature) => feature.name === selectedFeature)?.dataType,
    [features, selectedFeature]
  );
  const commonFilterOptions = [
    {
      label: "Is empty",
      op: JsonFilterOp.Equal,
      value: "NULL",
    },
    {
      label: "Not empty",
      op: JsonFilterOp.NotEqual,
      value: "NULL",
    },
  ];

  const numberFilterOptions = [
    {
      label: "Equal to",
      op: JsonFilterOp.Equal,
    },
    {
      label: "Not equal to",
      op: JsonFilterOp.NotEqual,
    },
    {
      label: "Greater than",
      op: JsonFilterOp.GreaterThan,
    },
    {
      label: "Less than",
      op: JsonFilterOp.LessThan,
    },
    ...commonFilterOptions,
  ];

  const stringFilterOptions = [
    {
      label: "Is",
      op: JsonFilterOp.Equal,
    },
    {
      label: "Is not",
      op: JsonFilterOp.NotEqual,
    },
    {
      label: "Contains",
      op: JsonFilterOp.Contains,
    },
    {
      label: "Does not contain",
      op: JsonFilterOp.DoesNotContain,
    },
    {
      label: "Starts with",
      op: JsonFilterOp.StartsWith,
    },
    {
      label: "Ends with",
      op: JsonFilterOp.EndsWith,
    },
    ...commonFilterOptions,
  ];

  const filterOptions = useMemo(
    () =>
      selectedFeatureDataType === "number"
        ? numberFilterOptions
        : selectedFeatureDataType === "string"
        ? stringFilterOptions
        : commonFilterOptions,
    [selectedFeatureDataType]
  );

  const showInput = filterOp !== "Is empty" && filterOp !== "Not empty";

  return (
    <>
      <Popover>
        {({ open, close }) => (
          <>
            <Popover.Button size="xs" as={Button} variant="secondary">
              Add filter
            </Popover.Button>
            <Popover.Panel>
              {selectedFeature ? (
                <Card className="mt-1 absolute z-10 max-w-xs shadow-tremor-dropdown p-4">
                  <Flex className="justify-start">
                    <Icon
                      size="sm"
                      icon={ChevronLeft}
                      onClick={() => setSelectedFeature(null)}
                      className="pl-0"
                    />
                    <Text className="truncate font-semibold">
                      {selectedFeature}
                    </Text>
                    <Select
                      className="w-4 ml-auto"
                      value={filterOp}
                      onValueChange={setFilterOp}
                    >
                      {filterOptions.map((option) => (
                        <SelectItem key={option.label} value={option.label}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </Flex>

                  {!showInput ? undefined : selectedFeatureDataType ===
                    "string" ? (
                    <TextInput
                      value={filterValue}
                      className="mt-4"
                      onChange={(event) => setFilterValue(event.target.value)}
                    />
                  ) : (
                    selectedFeatureDataType === "number" && (
                      <NumberInput
                        className="mt-4"
                        value={filterValue}
                        onValueChange={setFilterValue}
                      />
                    )
                  )}
                  <Button
                    size="xs"
                    className="mt-4"
                    disabled={showInput && !filterValue}
                    onClick={() => {
                      close();
                      const option = filterOptions.find(
                        (option) => option.label === filterOp
                      );

                      onAddFilter({
                        path: selectedFeature,
                        op: option.op,
                        value: option.value || filterValue,
                        dataType: selectedFeatureDataType,
                      });

                      setSelectedFeature(null);
                      setFilterValue("");
                    }}
                  >
                    Add filter
                  </Button>
                </Card>
              ) : (
                <Select
                  listOnly
                  onValueChange={(value) => {
                    setSelectedFeature(value);
                  }}
                >
                  {features.map((feature) => (
                    <SelectItem value={feature.name} key={feature.name}>
                      {feature.name}
                    </SelectItem>
                  ))}
                </Select>
              )}
            </Popover.Panel>
          </>
        )}
      </Popover>
    </>
  );
}

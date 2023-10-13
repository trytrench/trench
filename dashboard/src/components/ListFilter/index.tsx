// universal filter component - works for both entities and events

import { ChevronDownIcon, ListFilter, ListFilterIcon } from "lucide-react";
import { Badge, Card, SelectItem, Text } from "@tremor/react";
import { useState } from "react";
import * as Select from "@radix-ui/react-select";
import { FilterChip } from "./Chips";
import clsx from "clsx";

interface Props {
  options: {
    types: string[];
    labels: string[];
    features: { feature: string; dataType: string }[];
  };
  onChange: (filter: FilterOutput) => void;
}
interface FilterOutput {
  types: string[];
  // sortBy: {
  //   feature: string;
  //   direction: string;
  //   dataType: string;
  // } | null;
  labels: string[];
  features: { feature: string; dataType: string }[];
}

function Filter(props: Props) {
  const { options, onChange } = props;

  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "payment-attempt",
  ]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);

  return (
    <div className="flex flex-wrap items-center pr-3 self-stretch border-r">
      <ListFilter className="h-4 w-4" />
      {/* need to implement */}
    </div>
  );
}

export default Filter;

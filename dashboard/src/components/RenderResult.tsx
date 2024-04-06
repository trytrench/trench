import { FeatureDef, TypeName, TypedData } from "event-processing";
import { AlertCircle } from "lucide-react";
import { EntityChip } from "./EntityChip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { FeatureColor, LABEL_COLOR_MAP } from "./nodes/colors";

type Result =
  | { type: "error"; message: string }
  | { type: "success"; data: TypedData };

export function RenderResult({
  result,
  metadata,
}: {
  result: Result;
  metadata?: FeatureDef["metadata"];
}) {
  switch (result.type) {
    case "error":
      return (
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger>
              <div className="text-red-600">
                <AlertCircle className="inline-block mr-2" size={16} />
                Error
              </div>
            </TooltipTrigger>
            <TooltipContent>{result.message}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    case "success":
      return (
        <div className="truncate">
          <RenderTypedData data={result.data} metadata={metadata} />
        </div>
      );
  }
}

export function RenderTypedData({
  data,
  metadata,
}: {
  data: TypedData;
  metadata?: FeatureDef["metadata"];
}) {
  switch (data.schema.type) {
    case TypeName.Boolean:
      return data.value ? "True" : "False";
    case TypeName.String:
    case TypeName.Name:
      if (metadata?.labels) {
        const label = metadata.labels.find((l) => l.name === data.value);
        if (label)
          return (
            <div
              className={`px-2 py-0.5 text-xs font-medium rounded-md inline-block ${
                LABEL_COLOR_MAP[label.color as FeatureColor]
              }`}
            >
              {data.value}
            </div>
          );
      }

      return data.value || "-";
    case TypeName.Float64:
    case TypeName.Int64:
      return data.value;
    case TypeName.URL:
      return (
        <a className="underline" target="_blank" href={data.value}>
          {data.value}
        </a>
      );
    case TypeName.Location:

    default:
      return JSON.stringify(data.value);
  }
}

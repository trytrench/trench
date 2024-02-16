import { TypeName, TypedData } from "event-processing";
import { AlertCircle } from "lucide-react";
import { EntityChip } from "./EntityChip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type Result =
  | { type: "error"; message: string }
  | { type: "success"; data: TypedData };

export function RenderResult({ result }: { result: Result }) {
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
          <RenderTypedData data={result.data} />
        </div>
      );
  }
}
export function RenderTypedData({ data }: { data: TypedData }) {
  switch (data.schema.type) {
    case TypeName.Boolean:
      return data.value ? "True" : "False";
    case TypeName.String:
    case TypeName.Name:
      return data.value;
    case TypeName.Float64:
    case TypeName.Int64:
      return data.value;
    case TypeName.Location:

    default:
      return JSON.stringify(data.value);
  }
}

import { DataType, type TypedDataMap } from "event-processing";
import { EntityChip } from "./EntityChip";
import { AlertCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

type Result =
  | {
      type: "error";
      message: string;
    }
  | {
      type: "success";
      data: TypedDataMap[DataType];
    };

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
      return <RenderTypedData data={result.data} />;
  }
}
export function RenderTypedData({ data }: { data: TypedDataMap[DataType] }) {
  switch (data.type) {
    case DataType.Entity:
      return <EntityChip entity={data.value} />;
    case DataType.Boolean:
      return <div>{data.value ? "True" : "False"}</div>;
    case DataType.String:
      return <div>{data.value}</div>;
    case DataType.Float64:
    case DataType.Int64:
      return <div>{data.value}</div>;
  }
}

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
      return <RenderTypedData data={result.data} />;
  }
}
export function RenderTypedData({ data }: { data: TypedData }) {
  switch (data.schema.type) {
    case TypeName.Entity:
      // return <EntityChip entity={data.value} />;
      return <div>Lel</div>;
    case TypeName.Boolean:
      return <div>{data.value ? "True" : "False"}</div>;
    case TypeName.String:
    case TypeName.Name:
      return <div>{data.value}</div>;
    case TypeName.Float64:
    case TypeName.Int64:
      return <div>{data.value}</div>;
    case TypeName.Location:

    default:
      return <div>{JSON.stringify(data.value)}</div>;
  }
}

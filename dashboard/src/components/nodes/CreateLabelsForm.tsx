import { Plus, X } from "lucide-react";
import { UseFormSetValue } from "react-hook-form";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { DOT_COLOR_MAP, FeatureColor } from "./colors";

interface Props {
  labels: { name: string; color: FeatureColor }[];
  onChange: UseFormSetValue<{
    labels: { name: string; color: FeatureColor }[];
  }>;
}

const CreateLabelsForm = ({ labels, onChange }: Props) => {
  return (
    <div className="space-y-1">
      {labels.map((label, index) => (
        <div className="flex items-center space-x-2" key={index}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <div
                  className={`rounded-full ${
                    DOT_COLOR_MAP[label.color]
                  } w-3 h-3`}
                ></div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="flex space-x-2">
                {Object.keys(FeatureColor).map((color) => (
                  <div
                    key={color}
                    onClick={() => {
                      onChange(`labels.${index}.color`, color as FeatureColor);
                    }}
                    className={`rounded-full ${
                      DOT_COLOR_MAP[color as FeatureColor]
                    } w-4 h-4`}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Input
            value={label.name}
            onChange={(e) => {
              onChange(`labels.${index}.name`, e.target.value);
            }}
          />
          <X
            className="w-4 h-4"
            onClick={() => {
              onChange(
                "labels",
                labels.filter((_, i) => i !== index)
              );
            }}
          />
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        type="button"
        onClick={() =>
          onChange("labels", [
            ...labels,
            { name: "", color: FeatureColor.Gray },
          ])
        }
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
};

export default CreateLabelsForm;

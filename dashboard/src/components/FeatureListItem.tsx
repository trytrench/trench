import {
  Asterisk,
  EyeIcon,
  EyeOffIcon,
  GripVerticalIcon,
  Hash,
  InfoIcon,
  LucideIcon,
  PencilIcon,
  ToggleLeft,
  Type,
} from "lucide-react";
import { forwardRef, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Input } from "./ui/input";
import { CommandItem } from "./ui/command";

export interface FeatureListItemProps {
  feature: string;
  name: string;
  dataType: string;
  hidden: boolean;
  onFeatureChange?: (value: {
    name?: string;
    dataType?: string;
    hidden?: boolean;
  }) => void;
  onToggleHide?: (hidden: boolean) => void;
  onRename?: (newName: string) => void;
  style?: React.CSSProperties;
}

// eslint-disable-next-line react/display-name
export const FeatureListItem = forwardRef<HTMLDivElement, FeatureListItemProps>(
  (props, ref) => {
    const {
      feature,
      name: initialName,
      dataType,
      hidden: initialHidden,
      onFeatureChange,
      style,
      ...rest
    } = props;

    const [value, setValue] = useState(dataType);
    const [hidden, setHidden] = useState(initialHidden);
    const [name, setName] = useState(initialName || feature);

    const dataTypeToIcon = {
      text: Type,
      number: Hash,
      boolean: ToggleLeft,
    } as Record<string, LucideIcon>;

    const Icon = dataTypeToIcon[value] ?? Asterisk;

    return (
      <Popover>
        <CommandItem className="aria-selected:bg-card aria-selected:text-card-foreground p-0 last:mb-4">
          <div
            className="flex items-center w-full justify-between gap-2 px-2 pt-1.5"
            ref={ref}
            style={style}
          >
            <GripVerticalIcon className="w-4 h-4 cursor-pointer" {...rest} />
            <div className="mr-auto text-sm">{name}</div>

            <Icon className="w-4 h-4" />
            <Select
              value={value}
              onValueChange={(value) => {
                setValue(value);
                onFeatureChange?.({ dataType: value });
              }}
            >
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
              </SelectContent>
            </Select>

            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger>
                  <InfoIcon className="w-4 h-4 cursor-pointer" />
                </TooltipTrigger>
                <TooltipContent>
                  <div>
                    <div className="text-sm font-bold">Feature</div>
                    <div className="text-sm">{feature}</div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <PopoverTrigger>
              <PencilIcon className="w-4 h-4 cursor-pointer" />
            </PopoverTrigger>
            {hidden ? (
              <EyeOffIcon
                className="w-4 h-4 cursor-pointer"
                onClick={() => {
                  setHidden(false);
                  onFeatureChange?.({ hidden: false });
                }}
              />
            ) : (
              <EyeIcon
                className="w-4 h-4 cursor-pointer"
                onClick={() => {
                  setHidden(true);
                  onFeatureChange?.({ hidden: true });
                }}
              />
            )}
          </div>

          <PopoverContent>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                // setIsEditing(false);
              }}
            >
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  onFeatureChange?.({ name: event.target.value });
                  //   debouncedSave(event.target.value || "Untitled");
                }}
              />
            </form>
          </PopoverContent>
        </CommandItem>
      </Popover>
    );
  }
);

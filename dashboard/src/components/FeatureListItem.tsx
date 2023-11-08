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

interface Props {
  feature: string;
  name: string;
  dataType: string;
  hidden: boolean;
  onChange: (value: string) => void;
  onToggleHide?: (hidden: boolean) => void;
  onRename?: (name: string) => void;
  onDataTypeChange?: (dataType: string) => void;
  draggable: boolean;
  color?: string;
}

export type Ref = HTMLButtonElement;

// eslint-disable-next-line react/display-name
export const FeatureListItem = forwardRef<Ref, Props>((props, ref) => {
  const {
    feature,
    name: initialName,
    dataType,
    hidden: initialHidden,
    onDataTypeChange,
    onRename,
    style,
    onToggleHide,
    onColorChange,
    draggable,
    color: initialColor,
    ...rest
  } = props;

  const [value, setValue] = useState(dataType);
  const [hidden, setHidden] = useState(initialHidden);
  const [name, setName] = useState(initialName || feature);
  const [color, setColor] = useState(initialColor || "bg-gray-400");

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
          {!draggable && (
            <GripVerticalIcon className="w-4 h-4 cursor-pointer" {...rest} />
          )}
          <div className="mr-auto text-sm">{name}</div>

          {onColorChange && (
            <Popover>
              <PopoverTrigger asChild>
                <div className={`rounded-full ${color} w-2 h-2`}></div>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="flex space-x-2">
                  {[
                    "bg-gray-400",
                    "bg-green-600",
                    "bg-yellow-300",
                    "bg-orange-400",
                    "bg-red-500",
                  ].map((color) => (
                    <div
                      key={color}
                      onClick={() => {
                        setColor(color);
                        onColorChange(color);
                      }}
                      className={`rounded-full ${color} w-4 h-4`}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}

          <Icon className="w-4 h-4" />
          {onDataTypeChange && (
            <Select
              value={value}
              onValueChange={(value) => {
                setValue(value);
                onDataTypeChange(value);
              }}
            >
              <SelectTrigger className="w-36 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="entity">Entity</SelectItem>
              </SelectContent>
            </Select>
          )}

          {onRename && (
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
          )}

          {onRename && (
            <PopoverTrigger>
              <PencilIcon className="w-4 h-4 cursor-pointer" />
            </PopoverTrigger>
          )}
          {!onToggleHide ? undefined : hidden ? (
            <EyeOffIcon
              className="w-4 h-4 cursor-pointer"
              onClick={() => {
                setHidden(false);
                onToggleHide(false);
              }}
            />
          ) : (
            <EyeIcon
              className="w-4 h-4 cursor-pointer"
              onClick={() => {
                setHidden(true);
                onToggleHide(true);
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
                onRename(event.target.value);
                //   debouncedSave(event.target.value || "Untitled");
              }}
            />
          </form>
        </PopoverContent>
      </CommandItem>
    </Popover>
  );
});

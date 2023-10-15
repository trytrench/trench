import { Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import Select, { components } from "react-select";
import { cn } from "~/lib/utils";

interface Props extends React.ComponentProps<Select> {}

// TODO: fix.
type ClearIndicatorProps = any;
function ClearIndicator({
  innerProps,
  isDisabled,
  innerRef,
  clearValue,
  ...props
}: ClearIndicatorProps) {
  return (
    <button
      ref={innerRef}
      onClick={() => {
        clearValue();
      }}
      disabled={isDisabled}
      className="rounded-full text-muted-foreground hover:text-foreground mr-1"
      {...innerProps}
    >
      <X className="w-4 h-4 transition-colors" />
    </button>
  );
}

function DropdownIndicator() {
  return <ChevronDown className="w-4 h-4 text-muted-foreground" />;
}

function Option({ children, ...props }: any) {
  return (
    <div className="relative">
      <components.Option {...props} className={`pl-8 hover:bg-accent`}>
        {props.label}
      </components.Option>
      {props.isSelected && (
        <Check className="w-4 h-full absolute left-2 top-0"></Check>
      )}
    </div>
  );
}

function ClearableSelect({ ...props }: Props) {
  return (
    <Select
      {...props}
      components={{
        ClearIndicator: ClearIndicator,
        DropdownIndicator: DropdownIndicator,
        Option: Option,
      }}
      unstyled
      // isClearable={true}
      className="w-48 border rounded-md text-sm"
      classNames={{
        control: () => "px-3",
        menu: () =>
          "bg-card border rounded-md mt-1.5 shadow-md p-1 animate-in zoom-in-95 slide-in-from-top-2 transition-all",
        option: () => cn("px-2 py-1.5 text-sm rounded-sm"),
      }}
    />
  );
}

export { ClearableSelect };

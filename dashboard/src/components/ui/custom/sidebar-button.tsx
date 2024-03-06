// forward ref a button TS boilerplate

import React, { forwardRef } from "react";
import { cn } from "../../../lib/utils";

interface SidebarButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  className?: string;
}

export const SidebarButton = forwardRef<HTMLButtonElement, SidebarButtonProps>(
  (props, ref) => {
    const { selected, className, ...rest } = props;

    return (
      <button
        ref={ref}
        className={cn(
          "px-4 py-1 w-full text-sm font text-muted-foreground text-left rounded-md transition flex gap-2 items-center",
          {
            "bg-accent text-accent-foreground cursor-default": selected,
            "hover:bg-muted cursor-pointer": !selected,
          },
          className
        )}
        {...rest}
      ></button>
    );
  }
);

SidebarButton.displayName = "SidebarButton";

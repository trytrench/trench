import React, { useEffect, useRef } from "react";
import { cn } from "../lib/utils";

export interface AutoResizeInputProps
  extends Pick<
    React.InputHTMLAttributes<HTMLInputElement>,
    "onFocus" | "onBlur"
  > {
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  active: boolean;
  onClick?: () => void;
  onClickOutside?: (event: MouseEvent) => void;
}

export function AutoResizeInput({
  value,
  onChange,
  className,
  active,
  onClick,
  onFocus,
  onBlur,
  onClickOutside,
}: AutoResizeInputProps) {
  const spanRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (spanRef.current && inputRef.current) {
      inputRef.current.style.width = `${spanRef.current.offsetWidth}px`;
    }
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        console.log("Clicked outside");
        onClickOutside?.(event);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClickOutside]);

  return (
    <span ref={containerRef} className="relative" onClick={onClick}>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        ref={inputRef}
        style={{
          minWidth: "1rem",
        }}
        className={cn(className, {
          "bg-gray-200": active,
        })}
        readOnly={!active}
      />
      <span
        ref={spanRef}
        className={`${className} pointer-events-none absolute opacity-0`}
      >
        {value || " "}
      </span>
    </span>
  );
}

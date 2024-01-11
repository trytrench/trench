import React, { useEffect, useRef, useState } from "react";
import { DATA_TYPES_REGISTRY, type TSchema, TypeName } from "event-processing";
import * as Select from "@radix-ui/react-select";
import { SelectContent, SelectItem } from "./ui/select";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/utils";
import { useToast } from "./ui/use-toast";

interface SchemaBuilderProps {
  value: TSchema;
  onChange: (newValue: TSchema) => void;
}

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({
  value,
  onChange,
}) => {
  const { toast } = useToast();
  const handleTypeChange = (val: TypeName) => {
    const newValue: TSchema = DATA_TYPES_REGISTRY[val].defaultSchema;
    onChange(newValue);
  };

  const handleArrayItemsChange = (items: TSchema) => {
    if (value.type === TypeName.Array) {
      onChange({ ...value, items });
    }
  };

  const handleObjectPropertiesChange = (
    properties: Record<string, TSchema>
  ) => {
    if (value.type === TypeName.Object) {
      onChange({ ...value, properties });
    }
  };

  return (
    <span className="font-mono flex-col items-start">
      {/* Type selection */}
      <Select.Root value={value.type} onValueChange={handleTypeChange}>
        <Select.Trigger className="p-0 font-mono border-transparent">
          {value.type}
          <ChevronDown className="inline-block h-3 w-3" />
        </Select.Trigger>
        <SelectContent>
          {Object.keys(DATA_TYPES_REGISTRY as object).map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select.Root>

      {/* Array Items */}
      {value.type === TypeName.Array && (
        <span className="">
          <span className="mx-2">of</span>
          <SchemaBuilder
            value={value.items}
            onChange={handleArrayItemsChange}
          />
        </span>
      )}

      {/* Object Properties */}
      {value.type === TypeName.Object && (
        <>
          <button
            className="font-mono inline ml-4 text-blue-300"
            onClick={() => {
              let num = 1;

              const propKeys = Object.keys(value.properties);
              while (propKeys.includes(`prop_${num}`)) {
                num++;
              }
              const newPropName = `prop_${num}`;
              handleObjectPropertiesChange({
                ...value.properties,
                [newPropName]:
                  DATA_TYPES_REGISTRY[TypeName.String].defaultSchema,
              });
            }}
          >
            add
          </button>

          <div className="flex ml-4 flex-col items-start">
            {Object.entries(value.properties).map(
              ([propKey, propSchema], index) => (
                <span key={index} className="">
                  <EditableProperty
                    initialKey={propKey}
                    value={value}
                    onChange={(newKey) => {
                      const newProps = Object.fromEntries(
                        Object.entries(value.properties).map(([key, value]) => {
                          if (key === propKey) {
                            return [newKey, value];
                          }
                          return [key, value];
                        })
                      );
                      handleObjectPropertiesChange(newProps);
                    }}
                    onInvalid={(message) =>
                      toast({
                        title: "Invalid property name",
                        description: message,
                      })
                    }
                  />
                  <button
                    className="text-red-300 mr-4"
                    onClick={() => {
                      const newProperties = {
                        ...value.properties,
                      };
                      delete newProperties[propKey];
                      handleObjectPropertiesChange(newProperties);
                    }}
                  >
                    del
                  </button>
                  <SchemaBuilder
                    value={propSchema}
                    onChange={(newSchema) => {
                      const newProperties = {
                        ...value.properties,
                        [propKey]: newSchema,
                      };
                      handleObjectPropertiesChange(newProperties);
                    }}
                  />
                </span>
              )
            )}
          </div>
        </>
      )}

      {/* Additional form elements can be added here if needed */}
    </span>
  );
};

interface AutoResizeInputProps
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

const AutoResizeInput: React.FC<AutoResizeInputProps> = ({
  value,
  onChange,
  className,
  active,
  onClick,
  onFocus,
  onBlur,
  onClickOutside,
}) => {
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
};

type TObjectSchema = Extract<TSchema, { type: TypeName.Object }>;
interface EditablePropertyProps {
  initialKey: string;
  value: TObjectSchema;
  onChange: (newKey: string) => void;
  onInvalid: (message: string) => void;
}

const EditableProperty: React.FC<EditablePropertyProps> = ({
  initialKey,
  value,
  onChange,
  onInvalid,
}) => {
  const [editKey, setEditKey] = useState(initialKey);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditKey(initialKey);
  }, [initialKey]);

  const handleDefocus = () => {
    setIsEditing(false);

    if (editKey === "") {
      onInvalid("Property name cannot be empty");
      setEditKey(initialKey);
      return;
    }

    if (!isValidPropertyName(editKey)) {
      onInvalid(
        `Property name "${editKey}" is not a valid property identifier. It must start with a letter and not contain any special characters except for "$" and "_".`
      );
      setEditKey(initialKey);
      return;
    }

    if (
      editKey !== initialKey &&
      Object.keys(value.properties).includes(editKey)
    ) {
      onInvalid(`Property "${editKey}" already exists`);
      setEditKey(initialKey);
      return;
    }

    onChange(editKey);
  };

  return (
    <AutoResizeInput
      value={editKey}
      onChange={setEditKey}
      active={isEditing}
      className="inline font-bold outline-none mr-4"
      onFocus={() => setIsEditing(true)}
      onBlur={handleDefocus}
    />
  );
};

function isValidPropertyName(name: string) {
  const validIdentifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;

  return validIdentifier.test(name);
}

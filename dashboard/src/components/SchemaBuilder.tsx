import React, { Fragment } from "react";
import { DATA_TYPES_REGISTRY, type TSchema, TypeName } from "event-processing";
import * as Select from "@radix-ui/react-select";
import { SelectContent, SelectItem } from "./ui/select";
import { ChevronDown } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { api } from "../utils/api";
import { EditableProperty } from "./EditableProperty";

const ANY_STRING = "__any__";

interface SchemaBuilderProps {
  value: TSchema;
  onChange: (newValue: TSchema) => void;
}

export const SchemaBuilder: React.FC<SchemaBuilderProps> = ({
  value,
  onChange,
}) => {
  const { toast } = useToast();

  const { data: entityTypes } = api.entityTypes.list.useQuery();

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

      {/* Entity Type */}
      {value.type === TypeName.Entity && (
        <span className="">
          <span className="mx-2 text-gray-400">of type</span>
          <Select.Root
            value={value.entityType ?? ANY_STRING}
            onValueChange={(entityType) => {
              if (entityType === ANY_STRING) {
                onChange({ type: TypeName.Entity });
              } else {
                onChange({ ...value, entityType });
              }
            }}
          >
            <Select.Trigger className="p-0 font-mono border-transparent">
              {!value.entityType
                ? "Any"
                : entityTypes?.find((et) => et.id === value.entityType)?.type ??
                  "unknown"}
              <ChevronDown className="inline-block h-3 w-3" />
            </Select.Trigger>
            <SelectContent>
              <SelectItem value={ANY_STRING}>Any</SelectItem>
              {entityTypes?.map((et) => (
                <SelectItem key={et.id} value={et.id}>
                  {et.type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select.Root>
        </span>
      )}

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
            type="button"
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
                    value={propKey}
                    currentProperties={Object.keys(value.properties)}
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
                    type="button"
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

      {value.type === TypeName.Union && (
        <span className="">
          {"<"}
          {value.unionTypes.map((type, index) => (
            <Fragment key={index}>
              {index > 0 && <span className="mx-2 text-gray-400">|</span>}
              <SchemaBuilder
                key={index}
                value={type}
                onChange={(newType) => {
                  const newUnionTypes = [...value.unionTypes];
                  newUnionTypes[index] = newType;
                  onChange({ ...value, unionTypes: newUnionTypes });
                }}
              />
              <button
                type="button"
                className="text-red-300"
                onClick={() => {
                  const newUnionTypes = [...value.unionTypes];
                  newUnionTypes.splice(index, 1);
                  onChange({ ...value, unionTypes: newUnionTypes });
                }}
              >
                del
              </button>
            </Fragment>
          ))}
          {">"}
          <button
            type="button"
            className="font-mono inline ml-4 text-blue-300"
            onClick={() => {
              onChange({
                ...value,
                unionTypes: [
                  ...value.unionTypes,
                  DATA_TYPES_REGISTRY[TypeName.String].defaultSchema,
                ],
              });
            }}
          >
            add
          </button>
        </span>
      )}

      {/* Additional form elements can be added here if needed */}
    </span>
  );
};

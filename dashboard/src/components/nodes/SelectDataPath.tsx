import { NodeDef, TSchema, TypeName, createDataType } from "event-processing";
import { DataPath } from "../../shared/types";
import { api } from "../../utils/api";
import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { cn } from "../../lib/utils";
import { SchemaTag } from "../SchemaTag";
import { uniqBy } from "lodash";

type DataAccessNodeDef = Pick<
  NodeDef,
  "id" | "name" | "dependsOn" | "returnSchema"
>;

const EVENT_TYPE_NODE_ID = "event";

function useDataAccessNodes(props: { eventTypeId: string }) {
  const { eventTypeId } = props;

  const { data: nodes } = api.nodeDefs.list.useQuery({ eventTypeId });
  const { data: eventType } = api.eventTypes.get.useQuery({
    id: eventTypeId,
  });
  const dataAccessNodes: DataAccessNodeDef[] = useMemo(() => {
    const retSchema: TSchema = (eventType?.schema as unknown as any) ?? {
      type: TypeName.Any,
    };
    const eventTypeNode: DataAccessNodeDef = {
      id: EVENT_TYPE_NODE_ID,
      name: "Event",
      dependsOn: new Set(),
      returnSchema: retSchema,
    };
    return [eventTypeNode, ...(nodes ?? [])];
  }, [eventType, nodes]);
  const flattenedDataPaths = useMemo(() => {
    const dataPaths: DataPath[] = [];

    const getPaths = (
      schema: TSchema,
      prefix: string[]
    ): {
      path: string[];
      schema: TSchema;
    }[] => {
      const allPaths: {
        path: string[];
        schema: TSchema;
      }[] = [];
      if (schema.type === TypeName.Object) {
        for (const [key, subSchema] of Object.entries(schema.properties)) {
          const subPaths = getPaths(subSchema, [...prefix, key]);
          allPaths.push(...subPaths);
        }
      } else {
        return [
          {
            path: prefix,
            schema,
          },
        ];
      }

      return allPaths;
    };

    for (const node of dataAccessNodes) {
      const paths = getPaths(node.returnSchema, []);
      for (const path of paths) {
        dataPaths.push({
          nodeId: node.id,
          path: path.path,
          schema: path.schema,
        });
      }
    }

    return dataPaths;
  }, [dataAccessNodes]);

  return {
    dataAccessNodes,
    flattenedDataPaths,
  };
}

interface SelectDataPathProps {
  eventTypeId: string;
  value: DataPath | null;

  onChange: (value: DataPath | null) => void;
  onIsValidChange?: (isValid: boolean) => void;

  desiredSchema?: TSchema;
}

export function SelectDataPath(props: SelectDataPathProps) {
  const { eventTypeId, value, onChange, onIsValidChange, desiredSchema } =
    props;
  const { dataAccessNodes, flattenedDataPaths } = useDataAccessNodes({
    eventTypeId,
  });

  const filteredPaths = flattenedDataPaths.filter((path) => {
    const desiredType = createDataType(desiredSchema ?? { type: TypeName.Any });

    return desiredType.isSuperTypeOf(path.schema);
  });

  const filteredOptions = filteredPaths
    .filter((path) => path.nodeId === value?.nodeId)
    .map((path) => ({
      label: path.path.join("."),
      value: path.path.join("."),
    }))
    .filter((option) => !!option.value);

  const validNodes = uniqBy(filteredPaths, (path) => path.nodeId).map(
    (path) => ({
      label:
        dataAccessNodes.find((node) => node.id === path.nodeId)?.name ?? "",
      value: path.nodeId,
    })
  );

  return (
    <div>
      <Combobox
        value={value?.nodeId ?? ""}
        onChange={(newValue) => {
          onChange({
            path: [],
            nodeId: newValue,
            schema: dataAccessNodes.find((node) => node.id === newValue)
              ?.returnSchema ?? { type: TypeName.Any },
          });
        }}
        options={validNodes}
      />
      {filteredOptions.length > 0 && (
        <Combobox
          value={value?.path.join(".") ?? ""}
          onChange={(newValue) => {
            const newDataPath = flattenedDataPaths.find(
              (path) => path.path.join(".") === newValue
            );
            onChange({
              path: newDataPath?.path ?? [],
              nodeId: value?.nodeId ?? "",
              schema: newDataPath?.schema ?? { type: TypeName.Any },
            });
          }}
          renderOption={(option) => {
            const schema = flattenedDataPaths.find(
              (path) => path.path.join(".") === option.value
            )?.schema;
            if (!schema) {
              return null;
            }
            return (
              <div className="flex w-full justify-start text-white">
                <div className="text-gray-400">{option.label}</div>
                <div className="ml-4">
                  <SchemaTag schema={schema} />
                </div>
              </div>
            );
          }}
          options={filteredOptions}
        />
      )}
    </div>
  );
}

function Combobox(props: {
  value: string;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
  renderOption?: (option: { label: string; value: string }) => React.ReactNode;
  placeholder?: string;
}) {
  const { value, onChange, options, placeholder, renderOption } = props;

  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between"
        >
          {value
            ? options.find((option) => option.value === value)?.label
            : placeholder ?? "Select..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandEmpty>None found</CommandEmpty>
          <CommandGroup className="overflow-x-auto">
            {options.map((option) => (
              <CommandItem
                key={option.value}
                value={option.value}
                onSelect={() => {
                  onChange(option.value === value ? "" : option.value);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4 shrink-0",
                    value === option.value ? "opacity-100" : "opacity-0"
                  )}
                />
                {renderOption ? renderOption(option) : option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

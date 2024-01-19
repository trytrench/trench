import React, { useState } from "react";
import { DataPath, TSchema, TypeName, tSchemaZod } from "event-processing";
import { SelectDataPath } from "./SelectDataPath"; // Make sure this path is correct
import { z } from "zod";
import { argsSchema } from "event-processing/src/node-type-defs/lib/counts";
import { MinusCircle, PlusCircle } from "lucide-react";

interface SelectDataPathListProps {
  eventType: string;
  value: DataPath[];
  onChange: (value: DataPath[]) => void;
  args?: z.infer<typeof argsSchema>;
}

export const SelectDataPathList: React.FC<SelectDataPathListProps> = ({
  eventType,
  value,
  onChange,
  args,
}) => {
  // Add a new DataPath with default or predefined structure
  const addDataPath = (argSchema?: TSchema) => {
    const newDataPath: DataPath = {
      nodeId: "",
      path: [],
      schema: argSchema ?? { type: TypeName.Any }, // Default to 'Any' if no schema is provided
    };
    onChange([...value, newDataPath]);
  };

  // Update a specific DataPath in the list
  const updateDataPath = (index: number, newDataPath: DataPath) => {
    const updatedValue = [...value];
    updatedValue[index] = newDataPath;
    onChange(updatedValue);
  };

  // Remove a specific DataPath from the list
  const removeDataPath = (index: number) => {
    const updatedValue = [...value];
    updatedValue.splice(index, 1);
    onChange(updatedValue);
  };

  return (
    <div>
      {value.map((dataPath, index) => (
        <div key={index} className="flex items-center space-x-2 mb-2">
          <SelectDataPath
            eventType={eventType}
            value={dataPath}
            onChange={(newValue) => {
              if (newValue) updateDataPath(index, newValue);
            }}
            desiredSchema={args ? args[index]?.schema : undefined}
          />
          <button
            onClick={() => removeDataPath(index)}
            className="p-1 text-red-500 hover:text-red-700"
          >
            <MinusCircle size={20} />
          </button>
        </div>
      ))}
      {(!args || value.length < args.length) && (
        <button
          onClick={() => {
            addDataPath(args?.[value.length]?.schema);
          }}
          className="p-1 text-green-500 hover:text-green-700"
        >
          <PlusCircle size={20} />
          Add DataPath
        </button>
      )}
    </div>
  );
};

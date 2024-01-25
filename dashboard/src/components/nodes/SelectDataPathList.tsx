import React, { useState, useEffect } from "react";
import {
  type DataPath,
  type TSchema,
  TypeName,
  tSchemaZod,
} from "event-processing";
import { SelectDataPath } from "./SelectDataPath"; // Make sure this path is correct
import { z } from "zod";
import { MinusCircle, PlusCircle } from "lucide-react";
import { type CountArgs } from "event-processing/src/function-type-defs/lib/args";

interface SelectDataPathListProps {
  eventType: string;
  value: DataPath[];
  onChange: (value: DataPath[]) => void;
  args?: CountArgs;
  onArgsChange?: (value: CountArgs) => void;
  isEditingArgs?: boolean;
}

export const SelectDataPathList: React.FC<SelectDataPathListProps> = ({
  eventType,
  value: initialValue,
  onChange,
  args: initialArgs,
  onArgsChange,
  isEditingArgs = true,
}) => {
  const [dataPaths, setDataPaths] = useState<DataPath[]>(initialValue ?? []);
  const [args, setArgs] = useState<CountArgs>(initialArgs ?? []);

  // Sync local `dataPaths` and `args` state with props
  useEffect(() => {
    setDataPaths(initialValue ?? []);
    setArgs(initialArgs ?? []);
  }, [initialValue, initialArgs]);

  const handleArgNameChange = (index: number, newName: string) => {
    const updatedArgs = [...args];
    const arg = updatedArgs[index];
    if (arg) {
      arg.argName = newName;
      setArgs(updatedArgs);
      if (onArgsChange) {
        onArgsChange(updatedArgs);
      }
    }
  };

  const addDataPath = () => {
    const newDataPath: DataPath = {
      nodeId: "",
      path: [],
      schema: { type: TypeName.Any },
    };
    const newDataPaths = [...dataPaths, newDataPath];
    setDataPaths(newDataPaths);
    onChange(newDataPaths);

    if (isEditingArgs) {
      const newArg = {
        argName: `arg${dataPaths.length + 1}`,
        schema: newDataPath.schema,
      };
      const updatedArgs = [...args, newArg];
      setArgs(updatedArgs);
      if (onArgsChange) {
        onArgsChange(updatedArgs);
      }
    }
  };

  const updateDataPath = (index: number, newDataPath: DataPath) => {
    const updatedDataPaths = [...dataPaths];
    updatedDataPaths[index] = newDataPath;
    setDataPaths(updatedDataPaths);
    onChange(updatedDataPaths);

    const arg = args[index];
    if (isEditingArgs && arg) {
      const updatedArgs = [...args];
      updatedArgs[index] = {
        ...arg,
        schema: newDataPath.schema,
      };
      setArgs(updatedArgs);
      if (onArgsChange) {
        onArgsChange(updatedArgs);
      }
    }
  };

  const removeDataPath = (index: number) => {
    const updatedDataPaths = [...dataPaths];
    updatedDataPaths.splice(index, 1);
    setDataPaths(updatedDataPaths);
    onChange(updatedDataPaths);

    if (isEditingArgs) {
      const updatedArgs = [...args];
      updatedArgs.splice(index, 1);
      setArgs(updatedArgs);
      if (onArgsChange) {
        onArgsChange(updatedArgs);
      }
    }
  };

  console.log(args);

  return (
    <div>
      {args.map((arg, index) => (
        <div key={index} className="flex items-center space-x-2 mb-2">
          {isEditingArgs && (
            <input
              type="text"
              value={arg.argName}
              onChange={(e) => handleArgNameChange(index, e.target.value)}
              className="border p-1"
              placeholder="Arg Name"
            />
          )}
          <SelectDataPath
            eventType={eventType}
            value={dataPaths[index] ?? null}
            onChange={(newValue) => {
              if (newValue) updateDataPath(index, newValue);
            }}
            desiredSchema={isEditingArgs ? undefined : arg.schema}
          />
          <button
            onClick={() => removeDataPath(index)}
            className="p-1 text-red-500 hover:text-red-700"
          >
            <MinusCircle size={20} />
          </button>
        </div>
      ))}
      {isEditingArgs && args.length < dataPaths.length + 1 && (
        <button
          onClick={addDataPath}
          className="p-1 text-green-500 hover:text-green-700"
        >
          <PlusCircle size={20} />
          Add DataPath
        </button>
      )}
    </div>
  );
};

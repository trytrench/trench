import React, { useState, useEffect } from "react";
import {
  type DataPath,
  type TSchema,
  TypeName,
  tSchemaZod,
} from "event-processing";
import { SelectDataPath } from "./SelectDataPath"; // Make sure this path is correct
import { z } from "zod";
import { MinusCircle, Plus, PlusCircle, X } from "lucide-react";
import { type CountArgs } from "event-processing/src/function-type-defs/lib/args";
import { useEditorStore } from "./editor/state/zustand";
import { SelectDataPathOrEntityFeature } from "./SelectDataPathOrEntityFeature";
import { Button } from "../ui/button";

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

  const getDataPathInfo = useEditorStore.use.getDataPathInfo();

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
    };
    const newDataPaths = [...dataPaths, newDataPath];
    setDataPaths(newDataPaths);
    onChange(newDataPaths);

    if (isEditingArgs) {
      const { schema } = getDataPathInfo(newDataPath);
      if (!schema) return;
      const newArg = {
        argName: `arg${dataPaths.length + 1}`,
        schema: schema,
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
      const { schema } = getDataPathInfo(newDataPath);
      if (!schema) return;
      updatedArgs[index] = {
        ...arg,
        schema: schema,
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

  return (
    <div>
      {dataPaths.map((dataPath, index) => (
        <div key={index} className="flex items-center space-x-2 mb-2">
          {/* {isEditingArgs && (
            <input
              type="text"
              value={arg.argName}
              onChange={(e) => handleArgNameChange(index, e.target.value)}
              className="border p-1"
              placeholder="Arg Name"
            />
          )} */}
          <SelectDataPathOrEntityFeature
            eventType={eventType}
            value={dataPaths[index] ?? null}
            onChange={(newValue) => {
              if (newValue) updateDataPath(index, newValue);
            }}
            // desiredSchema={isEditingArgs ? undefined : arg.schema}
          />
          <X onClick={() => removeDataPath(index)} className="w-4 h-4 " />
        </div>
      ))}
      {isEditingArgs && args.length < dataPaths.length + 1 && (
        <Button onClick={addDataPath} variant="outline" size="xs">
          <Plus className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

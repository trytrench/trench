import React, { useEffect, useState } from "react";
import { AutoResizeInput } from "./AutoResizeInput";

export function isValidPropertyName(name: string) {
  const validIdentifier = /^[a-zA-Z_$][a-zA-Z_$0-9]*$/;

  return validIdentifier.test(name);
}

export interface EditablePropertyProps {
  currentProperties: string[];
  value: string;
  onChange: (newKey: string) => void;
  onInvalid: (message: string) => void;
}

export function EditableProperty(props: EditablePropertyProps) {
  const { value, currentProperties, onChange, onInvalid } = props;

  const [editKey, setEditKey] = useState(value);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditKey(value);
  }, [value]);

  const handleDefocus = () => {
    setIsEditing(false);

    if (editKey === "") {
      onInvalid("Property name cannot be empty");
      setEditKey(value);
      return;
    }

    if (!isValidPropertyName(editKey)) {
      onInvalid(
        `Property name "${editKey}" is not a valid property identifier. It must start with a letter and not contain any special characters except for "$" and "_".`
      );
      setEditKey(value);
      return;
    }

    if (editKey !== value && currentProperties.includes(editKey)) {
      onInvalid(`Property "${editKey}" already exists`);
      setEditKey(value);
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
}

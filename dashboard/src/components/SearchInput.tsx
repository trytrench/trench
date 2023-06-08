import { CreatableSelect } from "chakra-react-select";
import { useCallback, useState } from "react";

type Option = {
  label: string;
  value: string;
};
interface Props {
  options: Option[];
  placeholder: string;
  selectedOptions: Option[];
  onChange: (value: Option[]) => void;
}

function isOpenEnded(prefix: string, options: Option[]) {
  if (options.some((o) => o.value.startsWith(prefix) && o.value !== prefix)) {
    return false;
  } else {
    return true;
  }
}

function splitByLast(str: string, separator: string): [string, string] {
  const arr = str.split(separator);
  return [
    arr.slice(0, arr.length - 1).join(separator) ?? "",
    arr[arr.length - 1] ?? "",
  ];
}

export const SearchInput = ({
  options,
  placeholder,
  selectedOptions,
  onChange,
}: Props) => {
  const [inputValue, setInputValue] = useState("");

  const filterOption = useCallback(
    (option: Option, inputValue: string) => {
      if (selectedOptions.some((o) => o.value.startsWith(option.value))) {
        return false;
      }

      // count number of ":" in inputValue
      const numColons = inputValue.split(":").length - 1;
      const numColonsInOptionValue = option.value.split(":").length - 1;

      for (let i = 0; i < numColons; i++) {
        if (inputValue.split(":")[i] !== option.value.split(":")[i]) {
          return false;
        }
      }

      const showable = numColons === numColonsInOptionValue;
      const [prefix, suffix] = splitByLast(option.value, ":");
      const searchString = `${prefix}:${option.label}`;

      const isCreateOption = option.value === inputValue;
      return (
        (showable &&
          searchString.toLowerCase().includes(inputValue.toLowerCase())) ||
        isCreateOption
      );
    },
    [selectedOptions]
  );
  return (
    <CreatableSelect
      placeholder={placeholder}
      useBasicStyles
      formatCreateLabel={() => {
        const [prefix, suffix] = splitByLast(inputValue, ":");
        return `${prefix}: "${suffix}"`;
      }}
      onCreateOption={(inputValue) => {
        onChange([
          ...selectedOptions,
          { label: inputValue, value: inputValue },
        ]);
      }}
      // isDisabled={inputValue === "riskLevel:"}
      value={selectedOptions}
      isMulti
      isClearable={false}
      closeMenuOnSelect={false}
      onChange={(newOptions, { action }) => {
        if (action === "select-option") {
          const lastOption = newOptions[newOptions.length - 1];
          if (!lastOption) {
            return;
          }

          const { value, label } = lastOption;
          if (label.endsWith(":")) {
            setInputValue(label);
          } else {
            const allButLastOption = newOptions.slice(0, newOptions.length - 1);
            const [prefix, suffix] = splitByLast(value, ":");

            onChange([
              ...allButLastOption,
              { label: `${prefix}:${label}`, value: value },
            ]);
          }
        } else {
          onChange(newOptions);
        }
      }}
      isValidNewOption={(inputValue, _, options) => {
        const filteredOptions = options.filter((o) =>
          filterOption(o, inputValue)
        );

        return filteredOptions.length === 0 && inputValue.includes(":");
      }}
      inputValue={inputValue}
      onInputChange={setInputValue}
      filterOption={filterOption}
      chakraStyles={{
        container: (provided) => ({
          ...provided,
          minWidth: "300px",
        }),
        control: (provided) => ({
          ...provided,
          fontSize: "sm",
        }),
        option: (provided) => ({
          ...provided,
          fontSize: "sm",
        }),
      }}
      options={options}
    />
  );
};

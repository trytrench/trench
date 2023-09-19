import React from "react";
import { useQueryParam, ArrayParam } from "use-query-params";

interface Option {
  label: string;
  value: string;
}

interface SelectMultipleOptionsFlatProps<TOption extends Option> {
  options: TOption[];
  queryParamKey: string;
  renderOption?: (
    option: TOption,
    opts: { handleClick: (value: string) => void; selected: boolean }
  ) => React.ReactNode;
  onSelect?: (value: string) => void;
  onDeselect?: (value: string) => void;
}

export const SelectMultipleOptionsFlat = <TOption extends Option>({
  options,
  queryParamKey,
  renderOption,
  onSelect,
  onDeselect,
}: SelectMultipleOptionsFlatProps<TOption>) => {
  // Manage query parameter with useQueryParam hook
  const [selectedOptions, setSelectedOptions] = useQueryParam(
    queryParamKey,
    ArrayParam
  );

  const handleClick = (value: string) => {
    let newSelectedOptions = [...(selectedOptions ?? [])];
    if (newSelectedOptions.includes(value)) {
      newSelectedOptions = newSelectedOptions.filter((item) => item !== value);
      onDeselect?.(value);
    } else {
      newSelectedOptions.push(value);
      onSelect?.(value);
    }
    setSelectedOptions(newSelectedOptions); // This will update the query parameter
  };

  return (
    <>
      {options.map((option, index) =>
        renderOption ? (
          renderOption(option, {
            handleClick,
            selected: selectedOptions?.includes(option.value) ?? false,
          })
        ) : (
          <button
            key={index}
            className={`p-2 m-1 rounded ${
              selectedOptions?.includes(option.value)
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
            onClick={() => handleClick(option.value)}
          >
            {option.label}
          </button>
        )
      )}
    </>
  );
};

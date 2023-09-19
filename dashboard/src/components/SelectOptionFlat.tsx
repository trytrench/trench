import React from "react";
import { useQueryParam, StringParam } from "use-query-params";

interface Option {
  label: string;
  value: string;
}

interface SelectOptionFlatProps<TOption extends Option> {
  options: TOption[];
  queryParamKey: string;
  renderOption?: (
    option: TOption,
    opts: { handleClick: (value: string) => void; selected: boolean }
  ) => React.ReactNode;
  onSelect?: (value: string | null) => void;
}

export const SelectOptionFlat = <TOption extends Option>({
  options,
  queryParamKey,
  renderOption,
  onSelect,
}: SelectOptionFlatProps<TOption>) => {
  // Manage query parameter with useQueryParam hook
  const [selectedOption, setSelectedOption] = useQueryParam(
    queryParamKey,
    StringParam
  );

  const handleClick = (value: string) => {
    if (selectedOption === value) {
      // If the user clicks on the currently selected option, clear the query parameter
      setSelectedOption(undefined);
      onSelect?.(null);
    } else {
      onSelect?.(value);
      setSelectedOption(value); // This will update the query parameter
    }
  };

  return (
    <>
      {options.map((option, index) =>
        renderOption ? (
          renderOption(option, {
            handleClick,
            selected: selectedOption === option.value,
          })
        ) : (
          <button
            key={index}
            className={`p-2 m-1 rounded ${
              selectedOption === option.value
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

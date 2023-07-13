export function getLabelValuePairs(
  data: {
    label: string;
    value?: string | null | React.ReactNode;
    show?: boolean;
  }[]
) {
  return data
    .filter((item) => item.show !== false && typeof item.value !== "undefined")
    .map((item) => ({
      label: item.label,
      value: item.value ?? "--",
    }));
}

import { LeftItem } from "./types";

export function sortedForLeftSvgs(
  left: LeftItem[],
  leftSelection: string | null,
  lastLeftSelection: string | null
) {
  return [...left].sort((a, b) => {
    if (a.id === leftSelection) return 1;
    if (b.id === leftSelection) return -1;
    if (a.id === lastLeftSelection) return 1;
    if (b.id === lastLeftSelection) return -1;
    return 0;
  });
}

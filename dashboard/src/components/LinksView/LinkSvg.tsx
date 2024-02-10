import { LeftItem, LinkItem } from "./types";

interface LinkSVGProps {
  y1: number;
  y2: number;
  x: number;
  leftSelection: string | null;
  rightSelection: string | null;
  linkItem: LinkItem;
}

// vvv Svg links from left side to right side vvv

export function LinkSVG(props: LinkSVGProps) {
  const { y1, y2, x } = props;
  const { leftSelection, rightSelection, linkItem } = props;

  const EXTEND = 10; // how wide the straight line before the curve is
  const REACH = 0.6 * x; // how far the curve control points reach

  const selectionExists = leftSelection !== null || rightSelection !== null;
  const explicitlySelected =
    leftSelection === linkItem.from || rightSelection === linkItem.to;

  let opacity = 1;
  const colorName = "text-muted-foreground";

  if (explicitlySelected) {
  } else if (linkItem.itemType === "hiddenLink") {
    opacity = 0.05;
  } else if (linkItem.itemType === "link") {
    opacity = selectionExists ? 0.05 : 1;
  } else if (linkItem.itemType === "weightedLink") {
    if (selectionExists) {
      opacity = 0.05;
    } else {
      opacity = 0.3 + (0.7 * linkItem.weight) / linkItem.reference;
    }
  }

  console.log(opacity);

  // bezier curve
  return (
    <path
      d={`M 0 ${y1} L ${EXTEND} ${y1} C ${REACH} ${y1} ${x - REACH} ${y2} ${
        x - EXTEND
      } ${y2} L ${x} ${y2}`}
      fill="transparent"
      stroke="currentColor"
      strokeWidth={1.5}
      className={`${colorName} transition`}
      style={{ opacity: opacity }}
    />
  );
}

// vvv Svg links to the left of left side vvv

export function FirstLinkSVG({
  y,
  x,
  active,
}: {
  y: number;
  x: number;
  active: boolean;
}) {
  const RAD = x / 3; // radius of the curve
  const EXTEND = x / 3; // width of the flat part

  return (
    // just the circular arc part
    <path
      d={`M ${x - RAD - EXTEND} 0 L ${x - RAD - EXTEND} ${
        y - RAD
      } A ${RAD} ${RAD} 0 0 0 ${x - EXTEND} ${y} L ${x} ${y}
        `}
      fill="transparent"
      stroke="currentColor"
      strokeWidth={1.5}
      className={`${
        active ? "text-muted-foreground" : "text-muted"
      } transition`}
    />
  );
}

export function sortedForLeftSvgs(
  left: LeftItem[],
  leftSelection: string | null,
  lastLeftSelection: string | null
) {
  return left.toSorted((a, b) => {
    if (a.id === leftSelection) return 1;
    if (b.id === leftSelection) return -1;
    if (a.id === lastLeftSelection) return 1;
    if (b.id === lastLeftSelection) return -1;
    return 0;
  });
}

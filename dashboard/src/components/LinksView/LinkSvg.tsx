interface LinkSVGProps {
  y1: number;
  y2: number;
  x: number;
  w: number;
  opacity?: number;
}

// vvv Svg links from left side to right side vvv

export function LinkSVG({ y1, y2, x, w, opacity }: LinkSVGProps) {
  const EXTEND = 10;
  const REACH = 0.6 * x;
  const logW = Math.log(w + 1);
  // bezier curve
  return (
    <path
      d={`M 0 ${y1} L ${EXTEND} ${y1} C ${REACH} ${y1} ${x - REACH} ${y2} ${
        x - EXTEND
      } ${y2} L ${x} ${y2}`}
      fill="transparent"
      stroke="currentColor"
      strokeWidth={logW > 2 ? logW : 2}
      className={`text-gray-500 transition`}
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
  const RAD = x / 3;
  const EXTEND = x / 3;

  return (
    // just the circular arc part
    <path
      d={`M ${x - RAD - EXTEND} 0 L ${x - RAD - EXTEND} ${
        y - RAD
      } A ${RAD} ${RAD} 0 0 0 ${x - EXTEND} ${y} L ${x} ${y}
        `}
      fill="transparent"
      stroke="currentColor"
      strokeWidth={2}
      className={`${active ? "text-gray-500" : "text-gray-200"} transition`}
    />
  );
}

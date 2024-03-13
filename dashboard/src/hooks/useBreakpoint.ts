import resolveConfig from "tailwindcss/resolveConfig";
import { useMediaQuery } from "react-responsive";
import twConfig from "../../tailwind.config"; // Your tailwind config
import { useEffect, useState } from "react";

const fullConfig = resolveConfig({
  theme: twConfig.theme,
  content: twConfig.content,
});
const breakpoints = fullConfig.theme.screens;

type BreakpointKey = keyof typeof breakpoints;

export function useBreakpoint<K extends BreakpointKey>(breakpointKey: K) {
  const bool = useMediaQuery({
    query: `(min-width: ${breakpoints?.[breakpointKey]})`,
  });

  const [state, setState] = useState(false);
  useEffect(() => {
    setState(bool);
  }, [bool]);

  const capitalizedKey =
    breakpointKey[0]?.toUpperCase() + breakpointKey.substring(1);
  type Key = `is${Capitalize<K>}`;

  return {
    [`is${capitalizedKey}`]: state,
  } as Record<Key, boolean>;
}

import { VariantProps, cva } from "class-variance-authority";
import { useTheme } from "next-themes";

export function stringToHSL(str: string) {
  // Hash function to generate a number based on the input string
  function hashCode(s: string) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return h;
  }

  // Generate hue from the string hashcode
  const hue = Math.abs(hashCode(str)) % 360;

  const textSaturation = 40;
  const textLightness = 50;

  const darkTextSaturation = 40;
  const darkTextLightness = 70;

  // For the background color, we use the same hue, but with different saturation and lightness
  const bgSaturation = 90;
  const bgLightness = 95;

  const bgSaturationDark = 30;
  const bgLightnessDark = 20;

  const textColor = `hsl(${hue}, ${textSaturation}%, ${textLightness}%)`;
  const darkTextColor = `hsl(${hue}, ${darkTextSaturation}%, ${darkTextLightness}%)`;
  const backgroundColor = `hsl(${hue}, ${bgSaturation}%, ${bgLightness}%)`;
  const darkBackgroundColor = `hsl(${hue}, ${bgSaturationDark}%, ${bgLightnessDark}%)`;

  return {
    textColor,
    darkTextColor,

    backgroundColor,
    darkBackgroundColor,
  };
}

const codeHashVariants = cva("font-mono font-bold", {
  variants: {
    size: {
      sm: "text-sm px-1 py-0.5 rounded-sm",
      xs: "text-xs px-0.5 rounded-sm",
    },
  },
  defaultVariants: {
    size: "sm",
  },
});

type RenderCodeHashProps = { hashHex: string } & VariantProps<
  typeof codeHashVariants
>;

export function RenderCodeHash(props: RenderCodeHashProps) {
  const { hashHex, size } = props;

  const { resolvedTheme } = useTheme();

  const { textColor, darkTextColor, backgroundColor, darkBackgroundColor } =
    stringToHSL(hashHex);

  return (
    <span
      className={codeHashVariants({
        size: size,
      })}
      style={{
        color: resolvedTheme === "dark" ? darkTextColor : textColor,
        background:
          resolvedTheme === "dark" ? darkBackgroundColor : backgroundColor,
      }}
    >
      code-hash:{hashHex.slice(0, 8)}
    </span>
  );
}

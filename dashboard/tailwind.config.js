/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],

  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // TODO: use CSS variables
      colors: {
        border: "#e5e7eb",
        input: "#e5e7eb",
        ring: "#eff6ff",
        background: "#ffffff",
        foreground: "#6b7280",
        primary: {
          DEFAULT: "#dbeafe",
          foreground: "#3b82f6",
        },
        secondary: {
          DEFAULT: "#1f2937",
          foreground: "#e5e7eb",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#b91c1c",
        },
        muted: {
          DEFAULT: "#f9fafb",
          foreground: "#6b7280",
        },
        accent: {
          DEFAULT: "#dbeafe",
          foreground: "#3b82f6",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#6b7280",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#6b7280",
        },

        //
        emphasis: {
          foreground: "#1e293b",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

// shadcn defaults

// colors: {
//   border: "hsl(var(--border))",
//   input: "hsl(var(--input))",
//   ring: "hsl(var(--ring))",
//   background: "hsl(var(--background))",
//   foreground: "hsl(var(--foreground))",
//   primary: {
//     DEFAULT: "hsl(var(--primary))",
//     foreground: "hsl(var(--primary-foreground))",
//   },
//   secondary: {
//     DEFAULT: "hsl(var(--secondary))",
//     foreground: "hsl(var(--secondary-foreground))",
//   },
//   destructive: {
//     DEFAULT: "hsl(var(--destructive))",
//     foreground: "hsl(var(--destructive-foreground))",
//   },
//   muted: {
//     DEFAULT: "hsl(var(--muted))",
//     foreground: "hsl(var(--muted-foreground))",
//   },
//   accent: {
//     DEFAULT: "hsl(var(--accent))",
//     foreground: "hsl(var(--accent-foreground))",
//   },
//   popover: {
//     DEFAULT: "hsl(var(--popover))",
//     foreground: "hsl(var(--popover-foreground))",
//   },
//   card: {
//     DEFAULT: "hsl(var(--card))",
//     foreground: "hsl(var(--card-foreground))",
//   },
// },

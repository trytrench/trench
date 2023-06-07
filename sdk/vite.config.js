import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import obfuscator from "rollup-plugin-obfuscator";

// Root configuration
export default defineConfig(({ command, mode }) => {
  const isBuild = command === "build";

  // SDK Build configuration
  if (isBuild && mode === "sdk") {
    return {
      build: {
        lib: {
          entry: "src/index.ts",
          name: "@trench/sdk",
          fileName: "trench",
        },
        rollupOptions: {
          external: [],
          output: {
            globals: {},
          },
        },
      },
      plugins: [
        dts({
          insertTypesEntry: true,
          skipDiagnostics: true,
        }),
        obfuscator({
          options: {},
        }),
      ],
    };
  }

  // Example App configuration
  if (!isBuild || mode === "example") {
    return {
      root: "example",
      build: {
        outDir: "../example-dist",
      },
      server: {
        open: true,
      },
    };
  }
});
